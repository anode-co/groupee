
import {
    chainError,
    demoteUserHavingUserId,
    findTeamByName,
    postMessage
} from "../api/index.js";
import { reply } from "../commands/index.js";
import Server from '../server/index.js';

import Templating from '../templating/index.js';

import actions from "./actions.js";
import Routes from "../server/routes/index.js";

const getUsernameByUserId = ({ctx, userId}) => {
    ctx = (ctx /*:Context_t*/);
    const u = ctx.mm.users[userId];
    return u ? u.username : `user:${userId}`;
};

const postWelcomeMessage = (ctx, {teamId, userId}) => {
    return new Promise((resolve, reject) => {
        try {
            ctx.mm.getUserDirectMessageChannel(
                userId,
                channel => {
                    const username = getUsernameByUserId({ctx, userId});

                    const formattedMessage = Templating.formatWelcomeMessage(
                        ctx.cfg.templatingParams.welcomeMessage,
                        {
                            screen_name: username,
                            report_abuse_email: ctx.cfg.templatingParams.reportAbuseEmail
                        }
                    );

                    const url = Server.urlUtils.url(ctx);
                    const queryString = Server.urlUtils.queryString(
                        Server.urlUtils.params(teamId, channel, userId, username)
                    );

                    const props = {
                        "attachments": [
                            {
                                "text": ctx.cfg.templatingParams.questionAboutAcceptingRules,
                                "actions": [
                                    {
                                        "id": actions.ACTION_ID_ACCEPT_RULES,
                                        "name": ctx.cfg.templatingParams.labelAcceptRules,
                                        "integration": {
                                            "url": `${url}${Routes.routes.ROUTE_ACCEPT_RULES}?${queryString}`,
                                            "user_id": userId,
                                            "channel_id": channel.id,
                                            "team_id": teamId,
                                            "context": {
                                                "action": actions.ACTION_ID_ACCEPT_RULES,
                                            }
                                        }
                                    }
                                ]
                            }
                        ]
                    };

                    ctx.info({
                        props: props.attachments[0].actions,
                        integration: props.attachments[0].actions[0].integration
                    });

                    postMessage(
                        ctx,
                        formattedMessage,
                        channel.id,
                        props
                    )
                    .then(() => {
                        resolve(`Welcome message was successfully posted to user having id ${userId} in channel with id ${channel.id}`);
                    }, chainError)
                    .catch(e => ctx.error({e}));
                }
            );
        } catch (e) {
            reject(e);
        }
    });
};

const runWelcomeFlow = (ctx /*:Context_t*/, userId /*:string */, m /*:Message_t*/)/*: Promise<any>|void */ => {
    return findTeamByName(ctx)
        .then(({id: teamId}) => postWelcomeMessage(ctx, {teamId, userId}), chainError)
        .then(success => reply(ctx, success, m), chainError)
        .then(() => demoteUserHavingUserId(ctx, userId), chainError)
        .catch(e => {
            ctx.error(e);
            reply(ctx, `Could not run welcome flow with error: \n${e}`, m);
        });
};

export default runWelcomeFlow;
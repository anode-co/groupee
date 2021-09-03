
import {
    chainError, createDirectChannel,
    findTeamByName,
    postMessage
} from "../api/index.js";
import Server from '../server/index.js';

import Templating from '../templating/index.js';

import actions from "./actions.js";
import Routes from "../server/routes/index.js";

const getUsernameByUserId = ({ctx, userId}) => {
    ctx = (ctx /*:Context_t*/);
    const u = ctx.mm.users[userId];
    return u ? u.username : `user:${userId}`;
};

const postWelcomeMessage = async (ctx, {teamId, userId}) => {
    let channel;

    try {
        channel = await createDirectChannel(ctx, userId);
    } catch (e) {
        ctx.error(`Cannot create direct channel between bot and user having id ${userId}`);
        return;
    }

    return new Promise((resolve, reject) => {
        try {
            if (!channel.id) {
                reject(channel);
                return;
            }

            const username = getUsernameByUserId({ctx, userId});

            const formattedMessage = Templating.formatWelcomeMessage(
                ctx.cfg.templatingParams.welcomeMessage,
                {
                    screen_name: username,
                    report_abuse_email: ctx.cfg.templatingParams.reportAbuseEmail
                }
            );

            const url = Server.urlUtils.getBaseURL(ctx.cfg);
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
                                        "token": ctx.cfg.interactiveMessagesToken
                                    }
                                }
                            }
                        ]
                    }
                ]
            };

            ctx.debug({
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
        } catch (e) {
            reject(e);
        }
    });
};

const runWelcomeFlow = async (ctx /*:Context_t*/, userId /*:string */, m /*:Message_t*/)/*: Promise<any>|void */ => {
    try {
        let {id: teamId} = await findTeamByName(ctx);
        await postWelcomeMessage(ctx, {teamId, userId});
        ctx.info(`Successfully posted welcome flow to user having id ${userId}.`);
    } catch(e) {
        ctx.error(e);
    }
};

export default runWelcomeFlow;

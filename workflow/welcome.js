
import generateId from "../validation/generateId.js";

import {
    chainError,
    demoteUserHavingUserId,
    findTeamByName,
    getMainChannelsNames,
    postMessage
} from "../api/index.js";
import { reply } from "../commands/index.js";

import actions from "./actions.js";
import routes from "../server/routes.js";

const getUsernameByUserId = ({ctx, userId}) => {
    ctx = (ctx /*:Context_t*/);
    const u = ctx.mm.users[userId];
    return u ? u.username : `user:${userId}`;
};

const formatWelcomeMessage = (message, params) => {
    return message
        .replace(
            '{{ screen_name }}',
            params.screen_name
        )
        .replace(
            '{{ main_channels_names }}',
            params.main_channels_names
                .map(name => `- ~${name}`)
                .join("\n")
        )
        .replace(
            '{{ report_abuse_email }}',
            params.report_abuse_email
        );
};

const postWelcomeMessage = (ctx, {mainChannelsNames, teamId, userId}) => {
    return new Promise((resolve, reject) => {
        try {
            ctx.mm.getUserDirectMessageChannel(
                userId,
                channel => {
                    const username = getUsernameByUserId({ctx, userId});

                    const formattedMessage = formatWelcomeMessage(
                        ctx.cfg.templatingParams.welcomeMessage,
                        {
                            screen_name: username,
                            main_channels_names: mainChannelsNames,
                            report_abuse_email: ctx.cfg.templatingParams.reportAbuseEmail
                        }
                    );

                    const protocol = 'http://';
                    const url = `${protocol}localhost:${ctx.cfg.serverPort}`;
                    const redirectionUrlAfterRulesRejection = ctx.cfg.templatingParams.rulesRejectionRedirectionURL;
                    const params = {
                        team_id: teamId,
                        channel_id: channel.id,
                        user_id: userId,
                        username,
                        postId: generateId()
                    };
                    const queryString = Object.keys(params).map(p => `${p}=${params[p]}`).join('&');

                    const props = {
                        "attachments": [
                            {
                                "text": ctx.cfg.templatingParams.questionAboutAcceptingRules,
                                "actions": [
                                    {
                                        "id": actions.ACTION_ID_ACCEPT_RULES,
                                        "name": "Accept rules",
                                        "integration": {
                                            "url": `${url}${routes.ROUTE_ACCEPT_RULES}?${queryString}`,
                                            "user_id": userId,
                                            "channel_id": channel.id,
                                            "team_id": teamId,
                                            "post_id": params.postId,
                                            "context": {
                                                "action": actions.ACTION_ID_ACCEPT_RULES,
                                            }
                                        }
                                    }, {
                                        "id": actions.ACTION_ID_REJECT_RULES,
                                        "name": "Disable account",
                                        "integration": {
                                            "url": `${url}${routes.ROUTE_REJECT_RULES}?${queryString}&goto_location=${redirectionUrlAfterRulesRejection}`,
                                            "user_id": userId,
                                            "channel_id": channel.id,
                                            "team_id": teamId,
                                            "post_id": params.postId,
                                            "context": {
                                                "action": actions.ACTION_ID_REJECT_RULES,
                                            }
                                        }
                                    }
                                ]
                            }
                        ]
                    };

                    ctx.info({props: props.attachments[0].actions});

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
    return demoteUserHavingUserId(ctx, userId)
        .then(() => findTeamByName(ctx), chainError)
        .then(({id: teamId}) => getMainChannelsNames(ctx, teamId), chainError)
        .then(
            ({mainChannelsNames: mainChannelsNames, teamId: teamId}) =>
                postWelcomeMessage(ctx, {mainChannelsNames, teamId, userId}),
            chainError
        )
        .then(success => reply(ctx, success, m), chainError)
        .catch(e => {
            ctx.error(e);
            reply(ctx, `Could not run welcome flow with error: \n${e}`, m);
        });
};

export default runWelcomeFlow;
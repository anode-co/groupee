
import {
    METHOD_POST,
    guardAgainstMissingParams,
    matchingRoute,
    sendResponse
} from './index.js';

import {addMemberToMainChannels} from "../../../api/index.js";
import urlUtils from "../../urlUtils.js";
import Templating from "../../../templating/index.js";
import Routes from '../index.js';

const handleAcceptRules = async ({ctx, method, request, response, config}) => {
    const requestUrl = urlUtils.requestUrl(config, request);
    const pathname = requestUrl.pathname;
    let routeMatches = matchingRoute(
        {method, pathname},
        {
            expectedMethod: METHOD_POST,
            expectedRoute: `${ctx.cfg.externalRoutePrefix}${Routes.routes.ROUTE_ACCEPT_RULES}`
        });

    if (routeMatches) {
        let params;

        try {
            params = await guardAgainstMissingParams(ctx, request);
        } catch (e) {
            ctx.error(`Can not accept rules: some params are missing.`, e);

            sendResponse(
                response,
                {
                    response_type: "in_channel",
                    text: `Bad request ${e.message}`,
                },
                400
            );
            return;
        }

        let {teamId, userId, token} = params;

        if (token !== ctx.cfg.interactiveMessagesToken) {
            ctx.warning(`Invalid token used by client: "${token}"`);

            sendResponse(
                response,
                {
                    response_type: "in_channel",
                    text: "Unauthorized",
                },
                401
            );
            return;
        }

        let invites;

        try {
            ({invites} = await addMemberToMainChannels(ctx, teamId, userId));
        } catch (e) {
            ctx.error('Could not get main channels names', e);
        }

        let mainChannelsNames = [];
        if (invites.length > 0) {
            Object.keys(invites).forEach(k => invites[k].inviteToChannel());
            mainChannelsNames = Object.keys(invites).map(k => invites[k].name);
        }

        const formattedMessage = Templating.formatTourMessage(
            config.templatingParams.tour,
            {main_channels_names: mainChannelsNames}
        );

        sendResponse(
            response,
            {
                update: {
                    message: [
                        config.templatingParams.updatedAcceptedRulesMessage,
                        formattedMessage
                    ].join("\n\n"),
                    props: {}
                },
            }
        );
    }

    return routeMatches;
};

export default handleAcceptRules;

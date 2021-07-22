
import {
    METHOD_POST,
    guardAgainstMissingParams,
    matchingRoute,
    sendResponse
} from './index.js';

import {chainError, getMainChannelsNames} from "../../../api/index.js";
import urlUtils from "../../urlUtils.js";
import Templating from "../../../templating/index.js";
import Routes from '../index.js';

const handleAcceptRules = ({ctx, method, request, response, config}) => {
    const requestUrl = urlUtils.requestUrl(config, request);
    const pathname = requestUrl.pathname;
    let routeMatches = matchingRoute(
        {method, pathname},
        {
            expectedMethod: METHOD_POST,
            expectedRoute: Routes.routes.ROUTE_ACCEPT_RULES
        });

    if (routeMatches) {
        const {url, queryString, teamId} = guardAgainstMissingParams(ctx, requestUrl);
        const requirement = config.templatingParams.requirements[0];

        getMainChannelsNames(ctx, teamId)
            .then(({mainChannelsNames}) => {
                const formattedMessage = Templating.formatTourMessage(
                    config.templatingParams.tour,
                    {main_channels_names: mainChannelsNames}
                );

                const propsUrl = [
                    url,
                    Routes.routes.ROUTE_ACKNOWLEDGE_RECOMMENDATIONS,
                    `?${queryString}`,
                    `&actionId=${requirement.actionId}`,
                    `&nextActionId=${requirement.nextActionId}`
                ].join('');

                sendResponse(
                    response,
                    {
                        update: {
                            message: [
                                config.templatingParams.updatedAcceptedRulesMessage,
                                formattedMessage
                            ].join("\n\n"),
                            props: Templating.messageAttachmentsProps({
                                actionId: requirement.actionId,
                                text: requirement.text,
                                buttonLabel: requirement.buttonLabel,
                                url: propsUrl
                            })
                        },
                    }
                );

            }, chainError)
            .catch(e => ctx.error('Could not get main channels names', e));
    }

    return routeMatches;
};

export { handleAcceptRules };

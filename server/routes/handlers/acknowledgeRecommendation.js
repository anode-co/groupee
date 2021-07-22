
import {
    METHOD_POST,
    matchingRoute,
    sendResponse,
    guardAgainstMissingParams
} from './index.js';

import urlUtils from "../../urlUtils.js";

import Routes from "../index.js";
import Templating from "../../../templating/index.js";

const NO_MORE_ACTION_ID = '-1';

const handleAcknowledgeRecommendation = ({ctx, method, request, response, config}) => {
    const requestUrl = urlUtils.requestUrl(config, request);
    const pathname = requestUrl.pathname;

    let routeMatches = matchingRoute(
        {method, pathname},
        {
            expectedMethod: METHOD_POST,
            expectedRoute: Routes.routes.ROUTE_ACKNOWLEDGE_RECOMMENDATIONS
        });

    if (routeMatches) {
        const actionId = requestUrl.searchParams.get('actionId');
        if (!actionId) {
            throw 'Action id is missing';
        }

        const nextActionId = requestUrl.searchParams.get('nextActionId');
        if (!nextActionId) {
            throw 'Next action id is missing';
        }

        const {url, queryString} = guardAgainstMissingParams(ctx, requestUrl);
        const previousRequirement = config.templatingParams.requirements
        .find(r => r.actionId === actionId);

        const requirement = config.templatingParams.requirements
        .find(r => r.actionId === nextActionId);

        const message = previousRequirement.update;

        if (nextActionId === NO_MORE_ACTION_ID) {
            sendResponse(response, {
                update: {
                    message,
                    props: {}
                },
            });

            return routeMatches;
        }

        const propsUrl = [
            url,
            Routes.routes.ROUTE_ACKNOWLEDGE_RECOMMENDATIONS,
            `?${queryString}`,
            `&actionId=${requirement.actionId}`,
            `&nextActionId=${requirement.nextActionId}`,
        ].join('');

        sendResponse(response, {
            update: {
                message,
                props: Templating.messageAttachmentsProps({
                    actionId: requirement.actionId,
                    text: requirement.text,
                    buttonLabel: requirement.buttonLabel,
                    url: propsUrl
                })
            },
        });
    }

    return routeMatches;
};

export { handleAcknowledgeRecommendation };

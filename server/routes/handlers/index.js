import urlUtils from "../../urlUtils.js";

import { handleAcceptRules } from "./acceptRules.js";

const sendResponse = (response, updatePost = {}) => {
    response.writeHead(200, {"Content-Type": "application/json"});
    response.end(JSON.stringify(updatePost));
};

const matchingRoute = ({method, pathname}, {expectedMethod, expectedRoute}) => {
    return method === expectedMethod && expectedRoute === pathname;
};

const METHOD_POST = 'POST';

const guardAgainstMissingParams = (ctx, requestUrl) => {
    const teamId = requestUrl.searchParams.get('team_id');
    if (!teamId) {
        throw 'Team id is required to get main channel names';
    }

    const userId = requestUrl.searchParams.get('user_id');
    if (!userId) {
        throw 'User id is required to post a tour message.';
    }

    const channelId = requestUrl.searchParams.get('channel_id');
    if (!channelId) {
        throw 'Channel id is required to post a tour message.';
    }

    const url = urlUtils.url(ctx);
    const queryString = urlUtils.queryString({
        team_id: teamId,
        channel_id: channelId,
        user_id: userId
    });

    return {
        url,
        queryString,
        teamId,
        userId,
    };
};

export {
    METHOD_POST,
    guardAgainstMissingParams,
    handleAcceptRules,
    matchingRoute,
    sendResponse
};

export default {
    handleAcceptRules
};
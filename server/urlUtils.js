import {URL} from "url";

const getBaseURL = (config) => {
    const port = config.serverPort === 80 ? '' : `:${config.serverPort}`;

    return `http://${config.serverHost}:${port}`;
};

const params = (teamId, channel, userId, username) => {
    return {
        team_id: teamId,
        channel_id: channel.id,
        user_id: userId,
        username,
    };
};

const queryString = (params) => {
    return Object.keys(params)
        .map(p => `${p}=${params[p]}`)
        .join('&');
};

const requestUrl = (config, request) => {
    return new URL(request.url, getBaseURL(config));
};

export default {
    getBaseURL,
    params,
    queryString,
    requestUrl
};

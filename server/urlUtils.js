import {URL} from "url";

const url = (ctx) => {
    const protocol = 'http://';

    return `${protocol}localhost:${ctx.cfg.serverPort}`;
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
    const protocol = 'http://';
    const host = 'localhost';
    const port = config.serverPort === 80 ? '' : `:${config.serverPort}`;

    return new URL(request.url, `${protocol}${host}${port}`);
};

export default {
    url,
    params,
    queryString,
    requestUrl
};

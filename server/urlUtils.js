
import {URL} from "url";

const getBaseURL = (config) => {
    let scheme = 'https://';
    const host = config.externalHost === '::1' ? '[::1]' : `${config.externalHost}`;
    let port = config.externalPort === 80 ? '' : `:${config.externalPort}`;

    if (
        config.externalPort === 443 &&
        (
            !config.externalScheme || (
                typeof config.externalScheme === 'string' &&
                config.externalScheme.toLowerCase() !== 'https'
            )
        )
    ) {
        throw 'Inconsistent configuration. Secure HTTP port and scheme should match.';
    }

    if (config.externalPort === 443) {
        port = '';
    }

    if (
        !config.externalScheme ||
        !config.externalPort || (
            typeof config.externalPort === 'number' &&
            config.externalPort === 80
        )
    ) {
        scheme = 'http://';
    }

    if (['https://', 'http://'].includes(config.externalScheme)) {
        scheme = config.externalScheme;
    }

    return `${scheme}${host}${port}`;
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


import addMemberToMainChannels from "./addMemberToMainChannels.js";
import createDirectChannel from "./createDirectChannel.js";
import findTeamByName from "./findTeamByName.js";
import getPublicChannelByName from "./getPublicChannelByName.js";
import getTeamChannels from "./getTeamChannels.js";
import introduceNewcomer from "./introduceNewcomer.js";
import postMessage from "./postMessage.js";
import searchUserById from "./searchUserById.js";
import searchUserByTerm from "./searchUserByTerm.js";

const chainError = err => Promise.reject(err);

const apiCall = (ctx, method, path, post, then) => {
    ctx.info('API call', method, path);
    ctx.mm._apiCall(method, path, post, (data, headers) => {
        ctx.info('API call', method, path, ' -- done');
        return then(data, headers);
    });
};

const makeApiCallPromise = (ctx, uri, method, then, params = null) /*: Promise<any>*/ => {
    return (new Promise((resolve, reject) => {
        try {
            apiCall(
                ctx,
                method,
                uri,
                params,
                (data, headers) => {
                    if (typeof data === 'object' && data.error) {
                        reject(data);
                        return;
                    }

                    return then(data, resolve, headers, reject);
                }
            );
        } catch (e) {
            reject(e);
        }
    }));
};

export {
    addMemberToMainChannels,
    chainError,
    createDirectChannel,
    findTeamByName,
    getPublicChannelByName,
    getTeamChannels,
    introduceNewcomer,
    postMessage,
    searchUserById,
    searchUserByTerm
};

export default makeApiCallPromise;

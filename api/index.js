
import demoteUserHavingUserId from "./demoteUser.js";
import findSystemAdministrators from "./findSystemAdministrators.js";
import findTeamByName from "./findTeamByName.js";
import getMainChannelsNames from "./getMainChannelsNames.js";
import postMessage from "./postMessage.js";
import postCommand from "./postCommand.js";
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
                (data, headers) => then(data, resolve, headers, reject)
            );
        } catch (e) {
            reject(e);
        }
    }));
};

export {
    chainError,
    demoteUserHavingUserId,
    findSystemAdministrators,
    findTeamByName,
    getMainChannelsNames,
    postMessage,
    postCommand,
    searchUserByTerm
};

export default makeApiCallPromise;
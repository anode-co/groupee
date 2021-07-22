
import makeApiCallPromise from './index.js';

const findSystemAdministrators = (ctx, page = 0, perPage = 200 ) => {
    return makeApiCallPromise(
        ctx,
        `/users?page=${page}&per_page=${perPage}&role=system_admin`,
        'GET',
        (systemAdministrators, resolve, _, reject) => {
            if (
                !Array.isArray(systemAdministrators) ||
                systemAdministrators.length < 1
            ) {
                reject(`There are no system administrators`);
                return;
            }

            if (
                systemAdministrators
                    .find(a => a.id === ctx.mut.botId) === undefined
            ) {
                reject(`The configured bot account (see config.js) is not an administrator.`);
                return;
            }

            resolve(systemAdministrators);
        }
    );
};

export default findSystemAdministrators;
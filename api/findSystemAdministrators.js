
import makeApiCallPromise from './index.js';

const findSystemAdministrators = async (ctx, page = 0, perPage = 200 ) => {
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

            resolve(systemAdministrators);
        }
    );
};

export default findSystemAdministrators;
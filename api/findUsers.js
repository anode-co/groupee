
import makeApiCallPromise, {getUsersStats} from './index.js';

const findUsers = async (ctx, page = 0, perPage = 200 ) => {
    const totalUsers = await getUsersStats(ctx);
    const lastPageUsers = totalUsers % perPage;

    let totalPages = Math.floor(totalUsers / perPage);
    if (lastPageUsers !== 0) {
        totalPages = totalPages + 1;
    }

    return makeApiCallPromise(
        ctx,
        `/users?page=${page}&per_page=${perPage}&role=system_user`,
        'GET',
        (users, resolve) => {
            // - page index starts at 0
            // - page index equals to ( totalPages - 1 ) is the last page index and
            // - page index equals to ( totalPages - 2 ) is the last page index
            //   having a next page
            if (page < totalPages - 1) {
                resolve({
                    users,
                    nextPage: () => findUsers(ctx, page + 1, perPage)
                });

                return;
            }

            resolve(({
                users,
                nextPage: null
            }));
        }
    );
};

export default findUsers;

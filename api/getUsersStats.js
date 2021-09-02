
import makeApiCallPromise from './index.js';

const getUsersStats = async (ctx) => {
    return makeApiCallPromise(
        ctx,
        `/users/stats?role=system_user`,
        'GET',
        (totalUsers, resolve) => resolve(totalUsers)
    );
};

export default getUsersStats;

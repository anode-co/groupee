import makeApiCallPromise from './index.js';

const disableUserAccount = (ctx, userId) => {
    return makeApiCallPromise(
        ctx,
        `/users/${userId}/active`,
        'PUT',
        (response, resolve, _, reject) => {
            if (
                response.status !== 'OK'
            ) {
                reject(`Could not disable account of user having id ${userId}.`);
                return;
            }

            resolve(`The account of user having id ${userId} has been disabled successfully.`);
        },
        {'active': false}
    );
};

export default disableUserAccount;
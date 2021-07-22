
import makeApiCallPromise from "./index.js";

const searchUserByTerm = (ctx, term, page = 0) => {
    return makeApiCallPromise(
        ctx,
        '/users/search',
        'POST',
        (users, resolve, _, reject) => {
            if (!Array.isArray(users) || users.length < 1) {
                reject(`Ambiguous command. Can not find single user by term: "${term}"`);
                return;
            }

            resolve(users[0]);
        },
        {
            page,
            per_page: 200,
            term
        }
    );
};

export default searchUserByTerm;
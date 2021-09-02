
import makeApiCallPromise from "./index.js";
import {isValidUserIdFormat} from "../validation/index.js";

const searchUserById = (ctx, userId) => {
    if (!isValidUserIdFormat(userId)) {
        throw 'Invalid user id';
    }

    return makeApiCallPromise(
        ctx,
        `/users/${userId}`,
        'GET',
        (user, resolve, _, reject) => {
            if (user.id !== userId) {
                reject(`Could not find user having id: "${userId}"`);
                return;
            }

            resolve(user);
        },
        { user_ids: [userId] }
    );
};

export default searchUserById;

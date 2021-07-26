
import makeApiCallPromise from "./index.js";

const promoteGuest = (ctx /*:Context_t*/, userId /*:string */, then) /*: Promise<any>*/ => {
    return makeApiCallPromise(
        ctx,
        `/users/${userId}/promote`,
        'POST',
        (result, resolve, headers, reject) => {
            if (result.error) {
                reject(result.error);
                return;
            }

            resolve(result);

            if (typeof then === 'function') {
                then(result, headers);
            }
        }
    );
};

export default promoteGuest;
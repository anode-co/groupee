
import makeApiCallPromise from "./index.js";

const demoteUserHavingUserId = (ctx /*:Context_t*/, userId /*:string */, then) /*: Promise<any>*/ => {
    return makeApiCallPromise(
        ctx,
        `/users/${userId}/demote`,
        'POST',
        (result, resolve, headers, _) => {
            resolve(result);

            if (typeof then === 'function') {
                then(result, headers);
            }
        }
    );
};

export default demoteUserHavingUserId;
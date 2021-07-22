
import isValidUserIdFormat from "../validation/userId.js";
import searchUserByTerm from "../api/searchUserByTerm.js";
import runWelcomeFlow from "../workflow/welcome.js";
import {chainError} from "../api/index.js";
import reply from "./reply.js";

const wel = (ctx /*:Context_t*/, words /*:Array<string>*/, m /*:Message_t*/) => {
    const userIdOrUsername = words[0];
    const user = ctx.mm.getUserByID(userIdOrUsername);

    let isPrefixed = false;
    if (typeof userIdOrUsername !== 'undefined') {
        isPrefixed = userIdOrUsername[0] === '@';
    }

    if (
        !isPrefixed &&
        typeof user !== 'undefined' &&
        isValidUserIdFormat(user.id)
    ) {
        return runWelcomeFlow(ctx, user.id, m);
    }

    let username = userIdOrUsername;
    if (isPrefixed) {
        username = userIdOrUsername.substr(1, userIdOrUsername.length - 1);
    }

    return searchUserByTerm(ctx, `${username}`)
        .then(({id: userId}) => {
            if (!isValidUserIdFormat(userId)) {
                throw `Could not find user id from term ${username}`;
            }

            return runWelcomeFlow(ctx, userId, m);
        }, chainError)
        .catch(e => {
            reply(ctx, `Could not execute welcome command with error: \n${e}`, m);
        });
};

export default wel;
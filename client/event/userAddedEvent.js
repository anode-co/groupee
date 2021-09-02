import {isValidUserIdFormat} from "../../validation/index.js";
import {runWelcomeFlow} from "../../workflow/index.js";
import {searchUserById} from "../../../matterfoss-bot-promotion/api/index.js";

const handleUserAddedEvent = async (ctx /*: Context_t */, m) => {
    const userId = m.data.user_id;

    if (!m.data) {
    } else if (!isValidUserIdFormat(userId)) {
        ctx.error('Invalid user id');
        return;
    }

    const user = await searchUserById(ctx, userId);
    const usernamePrefix = ctx.cfg.username_prefix;

    if (
        typeof usernamePrefix === 'string' &&
        user.username.startsWith(usernamePrefix)
    ) {
        await runWelcomeFlow(ctx, userId, m);
    } else {
        ctx.info(`Did not take care of user having username not starting with prefix ("${usernamePrefix}")`);
    }
};

export default handleUserAddedEvent;

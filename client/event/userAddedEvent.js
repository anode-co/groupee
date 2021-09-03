import {isValidUserIdFormat} from "../../validation/index.js";
import {runWelcomeFlow} from "../../workflow/index.js";
import {getTeamChannels, searchUserById} from "../../api/index.js";

const handleUserAddedEvent = async (ctx /*: Context_t */, m) => {
    const userId = m.data.user_id;

    if (!m.data) {
    } else if (!isValidUserIdFormat(userId)) {
        ctx.error('Invalid user id');
        return;
    }

    const mainChannel = ctx.cfg.mainChannel;

    if (typeof mainChannel === 'undefined') {
        ctx.error(`"mainChannnel" param is required. See config.js`);
        return
    }

    const channels = await getTeamChannels(ctx);
    const channel = channels
    .find(c => [c.display_name, c.name].includes(mainChannel));

    if (
        channel === undefined ||
        typeof m.broadcast !== 'object' ||
        m.broadcast.channel_id !== channel.id
    ) {
        ctx.info(`Mismatching channel. Nothing to handle.`);
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

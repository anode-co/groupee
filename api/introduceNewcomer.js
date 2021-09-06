import {getPublicChannelByName, postMessage} from "./index.js";

const introduceNewcomer = async (ctx /*:Context_t*/, username, teamId) /*: Promise<any>*/ => {
    const introductions = ctx.cfg.introductions;

    if (!Array.isArray(introductions) || introductions.length === 0) {
        ctx.error('Please declare the introductions messages in ./config.js.');
        return;
    }

    const channel = await getPublicChannelByName(ctx, teamId);
    const index = Math.floor(Math.random() * introductions.length);

    try {
        await postMessage(
            ctx,
            introductions[index](`@${username}`),
            channel.id
        );
        ctx.info(`Successfully introduced guest havign "${username}" username.`);
    } catch (e) {
        ctx.error(e.message, e);
    }
};

export default introduceNewcomer;

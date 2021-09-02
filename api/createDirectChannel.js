
import makeApiCallPromise from "./index.js";

const createDirectChannel = (ctx /*:Context_t*/, userId) /*: Promise<any>*/ => {
    return makeApiCallPromise(
        ctx,
        '/channels/direct',
        'POST',
        (directChannel, resolve, _, reject) => {
            if (!directChannel.id) {
                const errorMessage = `Could not create direct channel between bot and user having user Id ${userId}`;
                ctx.error(errorMessage, directChannel);
                reject(directChannel);
                return;
            }

            resolve(directChannel);
        },
        [ctx.mut.botId, userId]
    );
};

export default createDirectChannel;

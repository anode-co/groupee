
import makeApiCallPromise from "./index.js";

const getPublicChannelByName = async (ctx /*:Context_t*/, teamId) /*: Promise<any>*/ => {
    const channelName = ctx.cfg.mainChannelName;

    if (!channelName) {
        throw 'Missing main channel name ("mainChannel" param). See config.js.';
    }

    return makeApiCallPromise(
        ctx,
        `/teams/${teamId}/channels/name/${channelName}`,
        'GET',
        (mainChannel, resolve, _, reject) => {
            if (typeof mainChannel !== 'object' || mainChannel.id === undefined) {
                reject(`Could not find main channel having name "${channelName}"`);
                return;
            }

            resolve(mainChannel);
        }
    );
};

export default getPublicChannelByName;

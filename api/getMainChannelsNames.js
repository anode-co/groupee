
import makeApiCallPromise from "./index.js";

const getMainChannelsNames = (ctx /*:Context_t*/, teamId) /*: Promise<any>*/ => {
    return makeApiCallPromise(
        ctx,
        `/teams/${teamId}/channels`,
        'GET',
        (mainChannels, resolve, _, __) => {
            if (!Array.isArray(mainChannels)) {
                throw 'Invalid main channels.';
            }

            if (mainChannels.length === 0) {
                throw 'No main channel name has been defined. See config.js.';
            }

            resolve({
                mainChannelsNames: mainChannels
                    .filter(channel => ctx.cfg.templatingParams.mainChannelsNames
                        .find(n => n === channel.display_name || n === channel.name)
                    )
                    .map(channel => channel.name),
                teamId
            });
        }
    );
};

export default getMainChannelsNames;
import makeApiCallPromise, {findTeamByName, getTeamPrivateChannels} from "./index.js";

const getTeamChannels = async (ctx /*:Context_t*/) /*: Promise<any>*/ => {
    let privateChannels;

    try {
        privateChannels = await getTeamPrivateChannels(ctx);
    } catch (e) {
        ctx.error('Cannot find private channels');
    }

    try {
        const {id: teamId} = await findTeamByName(ctx);

        return makeApiCallPromise(
            ctx,
            `/teams/${teamId}/channels`,
            'GET',
            (channels, resolve, _, __) => {
                if (!Array.isArray(channels)) {
                    throw 'Invalid main channels.';
                }

                if (channels.length === 0) {
                    throw 'No channel has been found.';
                }

                resolve(channels.concat(privateChannels));
        });
    } catch (e) {
        ctx.error('Can not find team channels');
    }
};

export default getTeamChannels;

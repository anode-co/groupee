import makeApiCallPromise, {findTeamByName} from "./index.js";

const getTeamPrivateChannels = async (ctx /*:Context_t*/) /*: Promise<any>*/ => {
    try {
        const {id: teamId} = await findTeamByName(ctx);

        return makeApiCallPromise(
            ctx,
            `/teams/${teamId}/channels/private`,
            'GET',
            (channels, resolve, _, __) => {
                if (!Array.isArray(channels)) {
                    throw 'Invalid main channels.';
                }

                if (channels.length === 0) {
                    ctx.info('No private channel has been found.');
                    resolve([]);
                    return;
                }

                resolve(channels);
        });
    } catch (e) {
        ctx.error('Can not find team channels');
    }
};

export default getTeamPrivateChannels;

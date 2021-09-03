import makeApiCallPromise, {findTeamByName} from "./index.js";

const getTeamChannels = async (ctx /*:Context_t*/) /*: Promise<any>*/ => {
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

                resolve(channels);
        });
    } catch (e) {
        ctx.error('Can not find team channels');
    }
};

export default getTeamChannels;

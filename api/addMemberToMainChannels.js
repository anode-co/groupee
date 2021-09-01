
import makeApiCallPromise from "./index.js";

const addMemberToMainChannels = (ctx /*:Context_t*/, teamId, userId) /*: Promise<any>*/ => {
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

            const invites = mainChannels
            .filter(channel => ctx.cfg.templatingParams.mainChannelsNames
                .find(n => n === channel.display_name || n === channel.name)
            )
            .map(channel => {
                return {
                    name: channel.name,
                    displayName: channel.display_name,
                    inviteToChannel: () => makeApiCallPromise(
                        ctx,
                        `/channels/${channel.id}/members`,
                        'POST',
                        (result) => {
                            ctx.debug(
                                `Making promise to invite user having id "${userId}" to "${channel.name}" channel`,
                                result
                            );
                        },
                        {
                            "user_id": userId,
                            "channel_id": channel.id,
                            "post_root_id": ""
                        }
                    )
                };
            });

            resolve({ invites });
        }
    );
};

export default addMemberToMainChannels;

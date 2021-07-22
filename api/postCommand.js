
import makeApiCallPromise from "./index.js";

const postCommand = (ctx, channelId, cmd, parameters = {}, then = null) => {
    return makeApiCallPromise(
        ctx,
        '/commands/execute',
        'POST',
        (result, resolve, headers, reject) => {
            if (typeof then === 'function') {
                then(result, resolve, headers, reject);
            } else {
                resolve(result);
            }
        },
        Object.assign(
            {},
            parameters,
            {
                command: cmd,
                channel_id: channelId,
            }
        )
    );
};

export default postCommand;

import makeApiCallPromise from "./index.js";

const postMessage = (
    ctx /*:Context_t*/,
    message /* string */,
    channelId /* string*/,
    props = null /* props */
) /*: Promise<any> */ => {
    return makeApiCallPromise(
        ctx,
        '/posts',
        'POST',
        (postedMessage, resolve, headers, _) => {
            ctx.info({attachments: postedMessage.props.attachments[0].actions});
            resolve(postedMessage);
        },
        {
            message,
            props,
            file_ids: [],
            create_at: 0,
            user_id: ctx.mut.botId,
            channel_id: channelId,
        }
    );
};

export default postMessage;
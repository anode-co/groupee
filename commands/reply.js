
const reply = (ctx, reply, m /*:Message_t*/) => {
    if (m.data.sender_name === undefined) {
        ctx.info(`in reaction to system event: ${reply}`);
        return;
    }

    ctx.info(`${m.data.sender_name}: ${reply}`);
    ctx.mm.postMessage(m.data.sender_name + ' ' + reply, m.broadcast.channel_id);
};

export default reply;

import { handleUserAddedEvent } from "./event/index.js";

const connect = (ctx) => {
    ctx.mm.login(ctx.cfg.email, ctx.cfg.passwd);

    ctx.mm.on('loggedIn', () => {
        ctx.info('logged in');
    });

    ctx.mm.on('meLoaded', (me) => {
        ctx.mut.botId = me.id;
        ctx.mut.botAccount = me;
        ctx.debug(`Bot account has user id "${me.id}"`);
    });

    ctx.mm.on('raw_message', async (m) => {
        if (m.event) {
            ctx.info({event: m.event});
        }

        if (m.event === 'user_added') {
            await handleUserAddedEvent(ctx, m);
        }
    });
};

export default connect;

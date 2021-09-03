
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
            try {
                await handleUserAddedEvent(ctx, m);
            } catch (e) {
                ctx.error(
                    `Can not handle "user_added" event for user having id ${m.data.user_id}`,
                    e
                );
            }
        }
    });
};

export default connect;

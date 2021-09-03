
import {handleNewUserEvent} from "./event/index.js";

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

        if (m.event === 'new_user') {
            try {
                setTimeout(async () => {
                    await handleNewUserEvent(ctx, m);
                }, 5 * 1000);
            } catch (e) {
                ctx.error(
                    `Can not handle "new_user" event for user having id ${m.data.user_id}`,
                    e
                );
            }
        }
    });
};

export default connect;

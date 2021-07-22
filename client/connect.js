
import { chainError, findSystemAdministrators } from "../api/index.js";
import { COMMANDS, reply } from '../commands/index.js';
import isValidUserIdFormat from '../validation/userId.js';
import runWelcomeFlow from "../workflow/welcome.js";

const channelById = (ctx, channelId, then) => {
    const chan = ctx.mm.getChannelByID(channelId);
    if (chan) { return void then(null, chan); }
};

const message = (ctx, m /*:Message_t*/) => {
    findSystemAdministrators(ctx)
        .then((systemAdministrators) => {
            ctx.mut.systemAdministrators = systemAdministrators;

            ctx.debug(`System administrators are ${systemAdministrators.map(a => a.username).join(',')}`);

            if (!m._channel || typeof m._channel.name !== 'string') {
                return;
            }

            // @see https://github.com/thierrymarianne/contrib-matterfoss/blob/99b26af24bf63be55acc3ba0e67843a0a36506e0/model/channel.go#L354-L359
            const directChannelUserIds = m.data.channel_name.split('__');

            if (ctx.mut.systemAdministrators.length < 1) {
                ctx.error('System administrators should be known before replying to reacting to events.');
                return;
            }

            if (
                directChannelUserIds
                    .some(
                        userId => ctx.mut.systemAdministrators.find(a => a.id === userId) === undefined
                    )
            ) {
                ctx.error('Only system administrators can send commands to bot account.');
                return;
            }

            if (m._post.user_id === ctx.mut.botId) { return; }
            const words = m._post.message.split(' ').filter((w) => w !== '');
            if (words.length < 1) {
                ctx.info('empty message');
                return;
            }

            const isDirectMessageChannel = (m._channel.type === 'D');
            const bang = (words[0].indexOf('!') === 0);
            const cmdName = words.shift().replace(/^!/, '');

            let c = COMMANDS[cmdName];
            if (bang && c) {
            } else {
                if (isDirectMessageChannel) { reply(ctx, "I don't understand what you said, use !help for a list commands", m); }
                return;
            }

            if (Array.isArray(c.argc)) {
                let ok = false;
                for (const count of c.argc) {
                    if (words.length === count) {
                        ok = true;
                    }
                }
                if (!ok) {
                    return void reply(ctx, `Error: ${cmdName} requires ${c.argc.join(' or ')} arguments (${c.help})`, m);
                }
            } else if (c.argc < 0) {
                if (words.length < -c.argc) {
                    return void reply(ctx, `Error: ${cmdName} requires at least ${c.argc} arguments (${c.help})`, m);
                }
            } else if (words.length !== c.argc) {
                return void reply(ctx, `Error: ${cmdName} requires ${c.argc} arguments (${c.help})`, m);
            }

            return void c.cmd(ctx, words, m);
        }, chainError);
};

const connect = (ctx) => {
    ctx.mm.login(ctx.cfg.email, ctx.cfg.passwd);

    ctx.mm.on('loggedIn', () => {
        ctx.info('logged in');
    });

    ctx.mm.on('meLoaded', (me) => {
        ctx.mut.botId = me.id;
    });

    ctx.mm.on('message', (m) => {
        if (m.event !== 'posted') {
        } else if (!m.data) {
        } else if (typeof m.data.post !== 'string') {
        } else {
            let obj = {};
            try {
                obj = JSON.parse(m.data.post);
            } catch (e) {
                ctx.info('failed to parse', m);
                return;
            }
            if (typeof obj.id !== 'string') {
            } else if (typeof obj.create_at !== 'number') {
            } else if (typeof obj.update_at !== 'number') {
            } else if (typeof obj.edit_at !== 'number') {
            } else if (typeof obj.delete_at !== 'number') {
            } else if (typeof obj.is_pinned !== 'boolean') {
            } else if (typeof obj.user_id !== 'string') {
            } else if (typeof obj.channel_id !== 'string') {
            } else if (typeof obj.root_id !== 'string') {
            } else if (typeof obj.parent_id !== 'string') {
            } else if (typeof obj.original_id !== 'string') {
            } else if (typeof obj.message !== 'string') {
            } else if (typeof obj.type !== 'string') {
            } else if (typeof obj.hashtags !== 'string') {
            } else if (typeof obj.pending_post_id !== 'string') {
            } else if (typeof obj.reply_count !== 'number') {
            } else {
                m._post = obj;
                return void channelById(ctx, m._post.channel_id, (err, ret) => {
                    if (err) {
                        ctx.error('channelById', err);
                        return;
                    }
                    m._channel = ret;
                    return void message(ctx, m);
                });
            }
        }

        ctx.info('unexpected message structure', m);
    });

    ctx.mm.on('raw_message', (m) => {
        if (m.event === 'new_user') {
            if (!m.data) {
            } else if (!isValidUserIdFormat(m.data.user_id)) {
                ctx.error('Invalid user id');
                return;
            }

            runWelcomeFlow(ctx, m.data.user_id, m);
            return;
        }

        if (m.event) {
            ctx.info({event: m.event});
        }
    });
};

export default connect;
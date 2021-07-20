/*@flow*/

const Mattermost = require('mattermost-client');

/*::
type Message_t = {
  event: string,                                 
  data: {                                        
    channel_display_name: string,
    channel_name: string,
    channel_type: string,
    mentions: string,
    post: string,
    sender_name: string,
    set_online: bool,            
    team_id: string,
  },
  broadcast: {
    omit_users: null,
    user_id: string,
    channel_id: string,
    team_id: string
  },
  seq: number,
  _post: {
      id: string,
      create_at: number,
      update_at: number,
      edit_at: number,
      delete_at: number,
      is_pinned: bool,
      user_id: string,
      channel_id: string,
      root_id: string,
      parent_id: string,
      original_id: string,
      message: string,
      type: string,
      props: Object,
      hashtags: string,
      pending_post_id: string,
      reply_count: number,
      metadata: Object
  },
  _channel: {
    "id": string,
    "create_at": number,
    "update_at": number,
    "delete_at": number,
    "team_id": string,
    "type": string,
    "display_name": string,
    "name": string,
    "header": string,
    "purpose": string,
    "last_post_at": number,
    "total_msg_count": number,
    "extra_update_at": number,
    "creator_id": string,
  },
};
type Context_t = {
    mm: any,
    cfg: any,
    mut: {
        bot_id: string
    }
}
*/


const userName = ({ctx, userId}) => {
    ctx = (ctx /*:Context_t*/);
    const u = ctx.mm.users[userId];
    return u ? u.username : `user:${userId}`;
};

const reply = (ctx, reply, m /*:Message_t*/) => {
    ctx.mm.postMessage(m.data.sender_name + ' ' + reply, m.broadcast.channel_id);
};

const apiCall = (ctx, method, path, post, then) => {
    console.error('apiCall', method, path);
    ctx.mm._apiCall(method, path, post, (data, headers) => {
        console.error('apiCall', method, path, ' -- done');
        return then(data, headers);
    });
};

const channelById = (ctx, channelId, then) => {
    const chan = ctx.mm.getChannelByID(channelId);
    if (chan) { return void then(null, chan); }
};

const isValidUserIdFormat = (userId) => {
    if (typeof userId !== 'string') {
        return false;
    }

    // A valid user id counts exactly 26 characters
    // and it contains only letters or numbers
    // @see https://github.com/thierrymarianne/contrib-matterfoss/blob/06b5ebb69b6c04d235da576d869e2e469223ccc9/model/utils.go#L558-L570
    // @see https://github.com/thierrymarianne/contrib-matterfoss/blob/06b5ebb69b6c04d235da576d869e2e469223ccc9/model/user.go#L263-L265
    return userId.length === 26
        && userId.split().every(c => new RegExp('[a-zA-Z0-9]').test(c));
};

const makeApiCallPromise = (ctx, uri, method, then, params = null) /*: Promise<any>*/ => {
    return new Promise((resolve, reject) => {
        try {
            apiCall(
                ctx,
                method,
                uri,
                params,
                (data, headers) => then(data, resolve, headers, reject)
            );
        } catch (e) {
            reject(e);
        }
    });
};

const findTeamByName = (ctx /*:Context_t*/) /*: Promise<any>*/ => {
    return makeApiCallPromise(
        ctx,
        `/teams/name/${ctx.cfg.team}`,
        'GET',
        (team, resolve, _, __) => resolve(team)
    );
};

const getMainChannelsNames = (ctx /*:Context_t*/, teamId) /*: Promise<any>*/ => {
    return makeApiCallPromise(
        ctx,
        `/teams/${teamId}/channels`,
        'GET',
        (mainChannels, resolve) => {
            if (mainChannels.length === 0) {
                throw 'No main channel name has been defined. See config.js.';
            }

            resolve(mainChannels
                .map(channel => channel.name));
        }
    );
};

const searchUserByTerm = (ctx, term, page = 0) => {
    return makeApiCallPromise(
        ctx,
        '/users/search',
        'POST',
        (users, resolve, _, reject) => {
            if (!Array.isArray(users) || users.length !== 1) {
                reject(`Ambiguous command. Can not find user by "${term}" term`);
            }

            resolve(users[0]);
        },
        {
            page,
            per_page: 200,
            term
        }
    );
};

const demoteUserHavingUserId = (ctx /*:Context_t*/, userId /*:string */, then) /*: Promise<any>*/ => {
    return makeApiCallPromise(
        ctx,
        `/users/${userId}/demote`,
        'POST',
        (result, resolve, headers) => {
            resolve(result);

            if (typeof then === 'function') {
                then(result, headers);
            }
        }
    );
};

const formatWelcomeMessage = (message, params) => {
    return message
        .replace(
            '{{ screen_name }}',
            `${params.screen_name}`
        )
        .replace(
            '{{ main_channels_names }}',
            params.main_channels_names
            .map(name => `- ~${name}`)
            .join("\n")
        );
};

const postWelcomeMessage = (ctx, mainChannelsNames, userId) => {
    return new Promise((resolve, reject) => {
        try {
            ctx.mm.getUserDirectMessageChannel(userId, channel => {
                const formattedMessage = formatWelcomeMessage(
                    ctx.cfg.welcomeMessage,
                    {
                        screen_name: userName({ctx, userId}),
                        main_channels_names: mainChannelsNames
                    }
                );

                ctx.mm.postMessage(formattedMessage, channel.id);
                resolve(
                    `Welcome message was successfully posted to user having id ${userId}`
                );
            });
        } catch (e) {
            reject(e);
        }
    });
};

const runWelcomeFlow = (ctx /*:Context_t*/, userId /*:string */, m /*:Message_t*/)/*: Promise<any> */ => {
    return demoteUserHavingUserId(ctx, userId)
    .then(() => findTeamByName(ctx))
    .then(({id: teamId}) => getMainChannelsNames(ctx, teamId))
    .then(mainChannelsNames => postWelcomeMessage(ctx, mainChannelsNames, userId))
    .then(success => reply(ctx, success, m));
};

const wel = (ctx /*:Context_t*/, words /*:Array<string>*/, m /*:Message_t*/) => {
    const userIdOrUsername = words[0];
    const user = ctx.mm.getUserByID(userIdOrUsername);

    let isPrefixed = false;
    if (typeof userIdOrUsername !== 'undefined') {
        isPrefixed = userIdOrUsername[0] === '@';
    }

    if (
        !isPrefixed &&
        typeof user !== 'undefined' &&
        isValidUserIdFormat(user.id)
    ) {
        return runWelcomeFlow(ctx, user.id, m);
    }

    let username = userIdOrUsername;
    if (isPrefixed) {
        username = userIdOrUsername.substr(1, userIdOrUsername.length - 1);
    }

    searchUserByTerm(ctx, `${username}`)
    .then(({id: userId}) => {
        if (!isValidUserIdFormat(userId)) {
            throw `Could not find user id from term ${username}`;
        }

        return runWelcomeFlow(ctx, userId, m);
    });
};

let COMMANDS;
let COMMANDS_PVT;
const help = (ctx /*:Context_t*/, _words /*:Array<string>*/, m /*:Message_t*/) => {
    let out = [`To send a command, use: !<command> <arg1> <arg2> ...`];
    for (const c in COMMANDS) {
        out.push(`**!${c}**: ${COMMANDS[c].help}`);
    }
    out.push(`\nIn a private chat with me, you can also use the commands:`);
    for (const c in COMMANDS_PVT) {
        out.push(`**!${c}**: ${COMMANDS_PVT[c].help}`);
    }
    out.push('For more information, see: https://github.com/anode-co/groupee/blob/master/readme.md');
    reply(ctx, out.join('\n'), m);
};

COMMANDS = {
    wel:       { cmd: wel,    argc:  [0, 1], help: 'Run welcome flow for a user'},
    help:      { cmd: help,   argc:  0, help: 'Display this message' },
};

const message = (ctx, m /*:Message_t*/) => {
    if (m._post.user_id === ctx.mut.bot_id) { return; }
    const words = m._post.message.split(' ').filter((w) => w !== '');
    if (words.length < 1) {
        console.log('empty message');
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
};

const connect = (ctx) => {
    ctx.mm.login(ctx.cfg.email, ctx.cfg.passwd);

    ctx.mm.on('loggedIn', () => {
        console.log('logged in');
    });

    ctx.mm.on('meLoaded', (me) => {
        ctx.mut.bot_id = me.id;
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
                console.log('failed to parse', m);
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
                        console.error('channelById', err);
                        return;
                    }
                    m._channel = ret;
                    return void message(ctx, m);
                });
            }
        }
        console.log('unexpected message structure', m);
    });

    ctx.mm.on('raw_message', (m) => {
        if (m.event === 'new_user') {
            if (!m.data) {
            } else if (!isValidUserIdFormat(m.data.user_id)) {
                console.error('Invalid user id');
                return;
            }

            runWelcomeFlow(ctx, m.data.user_id, m);
        }
    });
};

const main = (config) => {
    process.env.MATTERMOST_LOG_LEVEL = process.env.MATTERMOST_LOG_LEVEL || 'notice';

    const ctx = Object.freeze({
        mm: new Mattermost(
            config.server,
            config.team,
            {
                wssPort: config.wssPort,
                httpPort: config.httpPort
            }
        ),
        cfg: config,
        mut: {
            bot_id: '_'
        }
    });
    connect(ctx);
};
main(require('./config.js'));
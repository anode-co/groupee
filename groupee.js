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
        botId: string,
        systemAdministrators: Array<any>
    },
    debug: (...arg: any[]) => void,
    info: (...arg: any[]) => void,
    error: (...arg: any[]) => void,
    backtrace: () => void
}
*/

const chainError = err => Promise.reject(err);

const getUsernameByUserId = ({ctx, userId}) => {
    ctx = (ctx /*:Context_t*/);
    const u = ctx.mm.users[userId];
    return u ? u.username : `user:${userId}`;
};

const reply = (ctx, reply, m /*:Message_t*/) => {
    if (m.data.sender_name === undefined) {
        ctx.info(`in reaction to system event: ${reply}`);
        return;
    }

    ctx.info(`${m.data.sender_name}: ${reply}`);
    ctx.mm.postMessage(m.data.sender_name + ' ' + reply, m.broadcast.channel_id);
};

const apiCall = (ctx, method, path, post, then) => {
    ctx.info('API call', method, path);
    ctx.mm._apiCall(method, path, post, (data, headers) => {
        ctx.info('API call', method, path, ' -- done');
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
    return (new Promise((resolve, reject) => {
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
    }));
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
        (mainChannels, resolve, _, __) => {
            if (mainChannels.length === 0) {
                throw 'No main channel name has been defined. See config.js.';
            }

            resolve(mainChannels
                .filter(channel => ctx.cfg.templatingParams.mainChannelsNames
                    .find(n => n === channel.display_name || n === channel.name)
                )
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
            if (!Array.isArray(users) || users.length < 1) {
                reject(`Ambiguous command. Can not find single user by term: "${term}"`);
                return;
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

const findSystemAdministrators = (ctx, page = 0, perPage = 200 ) => {
    return makeApiCallPromise(
        ctx,
        `/users?page=${page}&per_page=${perPage}&role=system_admin`,
        'GET',
        (systemAdministrators, resolve, _, reject) => {
            if (
                !Array.isArray(systemAdministrators) ||
                systemAdministrators.length < 1
            ) {
                reject(`There are no system administrators`);
                return;
            }

            if (
                systemAdministrators
                .find(a => a.id === ctx.mut.botId) === undefined
            ) {
                reject(`The configured bot account (see config.js) is not an administrator.`);
                return;
            }

            resolve(systemAdministrators);
        }
    );
};

const demoteUserHavingUserId = (ctx /*:Context_t*/, userId /*:string */, then) /*: Promise<any>*/ => {
    return makeApiCallPromise(
        ctx,
        `/users/${userId}/demote`,
        'POST',
        (result, resolve, headers, _) => {
            resolve(result);

            if (typeof then === 'function') {
                then(result, headers);
            }
        }
    );
};

const postMessage = (
    ctx /*:Context_t*/,
    message /* string */,
    channelId /* string*/,
    then /*: void|(data: any, resolve: () => void, headers: any, reject: () => void) => void */,
    props = null /* props */
) /*: Promise<any> */ => {
    return makeApiCallPromise(
        ctx,
        '/posts',
        'POST',
        (postedMessage, resolve, headers, reject) => {
            if (typeof then === 'function') {
                then(postedMessage, resolve, headers, reject);
                return;
            }

            ctx.info({ postedMessage, headers });
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

const formatWelcomeMessage = (message, params) => {
    return message
        .replace(
            '{{ screen_name }}',
            params.screen_name
        )
        .replace(
            '{{ main_channels_names }}',
            params.main_channels_names
            .map(name => `- ~${name}`)
            .join("\n")
        )
        .replace(
            '{{ report_abuse_email }}',
            params.report_abuse_email
        );
};

const postWelcomeMessage = (ctx, mainChannelsNames, userId) => {
    return new Promise((resolve, reject) => {
        try {
            ctx.mm.getUserDirectMessageChannel(
                userId,
                channel => {
                    const formattedMessage = formatWelcomeMessage(
                        ctx.cfg.templatingParams.welcomeMessage,
                        {
                            screen_name: getUsernameByUserId({ctx, userId}),
                            main_channels_names: mainChannelsNames,
                            report_abuse_email: ctx.cfg.templatingParams.reportAbuseEmail
                        }
                    );

                    const protocol = process.env.MATTERMOST_USE_TLS ? 'https://' : 'http://';
                    const port = !ctx.cfg.httpPort ? '' : `:${ctx.cfg.httpPort}`;
                    const url = `${protocol}${ctx.cfg.server}${port}/${ctx.cfg.team}`;
                    const redirectionUrlAfterRulesRejection = ctx.cfg.templatingParams.rulesRejectionRedirectionURL;

                    postMessage(
                        ctx,
                        formattedMessage,
                        channel.id,
                        null,
                        {
                            "attachments": [
                                {
                                    "text": ctx.cfg.templatingParams.questionAboutAcceptingRules,
                                    "actions": [
                                        {
                                            "id": "give-tour",
                                            "name": "Accept rules",
                                            "integration": {
                                                url,
                                                "context": {
                                                    "action": "give-tour"
                                                }
                                            }
                                        }, {
                                            "id": "disable-account",
                                            "name": "Disable account",
                                            "integration": {
                                                "url": `${url}?${redirectionUrlAfterRulesRejection}`,
                                                "context": {
                                                    "action": "disabled-account"
                                                }
                                            }
                                        }
                                    ]
                                }
                            ]
                        }
                    )
                    .then(() => {
                        resolve(`Welcome message was successfully posted to user having id ${userId} in channel with id ${channel.id}`);
                    }, chainError);
                }
            );
        } catch (e) {
            reject(e);
        }
    });
};

const runWelcomeFlow = (ctx /*:Context_t*/, userId /*:string */, m /*:Message_t*/)/*: Promise<any>|void */ => {
    return demoteUserHavingUserId(ctx, userId)
    .then(() => findTeamByName(ctx), chainError)
    .then(({id: teamId}) => getMainChannelsNames(ctx, teamId), chainError)
    .then(mainChannelsNames => postWelcomeMessage(ctx, mainChannelsNames, userId), chainError)
    .then(success => reply(ctx, success, m), chainError)
    .catch(e => {
        ctx.error(e);
        reply(ctx, `Could not run welcome flow with error: \n${e}`, m);
    });
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

    return searchUserByTerm(ctx, `${username}`)
    .then(({id: userId}) => {
        if (!isValidUserIdFormat(userId)) {
            throw `Could not find user id from term ${username}`;
        }

        return runWelcomeFlow(ctx, userId, m);
    }, chainError)
    .catch(e => {
        reply(ctx, `Could not execute welcome command with error: \n${e}`, m);
    });
};

let COMMANDS;

const help = (ctx /*:Context_t*/, _words /*:Array<string>*/, m /*:Message_t*/) => {
    let out = [`To send a command, use: !<command> <arg1> <arg2> ...`];

    for (const c in COMMANDS) {
        out.push(`**!${c}**: ${COMMANDS[c].help}`);
    }

    out.push('For more information, see: https://github.com/anode-co/groupee/blob/master/readme.md');
    reply(ctx, out.join('\n'), m);
};

COMMANDS = {
    wel:       { cmd: wel,    argc:  [0, 1], help: 'Run welcome flow for a user'},
    help:      { cmd: help,   argc:  0, help: 'Display this message' },
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
        }
    });
};

const main = (config) => {
    process.env.MATTERMOST_LOG_LEVEL = process.env.MATTERMOST_LOG_LEVEL || 'notice';

    const client = new Mattermost(
        config.server,
        config.team,
        {
            wssPort: config.wssPort,
            httpPort: config.httpPort
        }
    );

    const logPrefix = 'GROUPEE';

    const debug = (...args) => {
        client.logger.debug(logPrefix, ...args);
    };

    const info = (...args) => {
        client.logger.info(logPrefix, ...args);
    };

    const error = (...args) => {
        client.logger.error(logPrefix, ...args);
    };
    
    const backtrace = () => {
        info({stack: (new Error()).stack});
    };

    const ctx = Object.freeze({
        mm: client,
        cfg: config,
        mut: {
            botId: '_',
            systemAdministrators: []
        },
        debug,
        info,
        error,
        backtrace
    });
    connect(ctx);
};
main(require('./config.js'));
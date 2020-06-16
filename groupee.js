/*@flow*/

const Fs = require('fs');
const Crypto = require('crypto');

const Mattermost = require('mattermost-client');
const nThen = require('nthen');

/*::
type Db_t = {
    _chans: { [string]: {[string]:number} },
};
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
  }
};
type Context_t = {
    db: Db_t,
    mm: any,
    cfg: any,
    mut: {
        userIdForName: {[string]:string},
        channelIdForName: {[string]:string},
        me: string,
        aolDate: ?string,
        aol: ?stream$Writable,
    },
}
*/


/*
* TODO:
* [ ] !tree -> show tree of groups which have current group as a member
* [ ] !tree (private message) -> show tree of groups
* [ ] !tree ~group (private message) -> show abbreviated tree stemming from ~group
* [ ] User invited to group while bot is off -> remove
* [ ] !invite -> re-invite to all rooms which might have been left
*/

const userName = ({ctx, userId}) => {
    ctx = (ctx /*:Context_t*/);
    const u = ctx.mm.users[userId];
    return u ? u.username : `user:${userId}`;
};
const chanName = ({ctx, channelId}) => {
    ctx = (ctx /*:Context_t*/);
    const c = ctx.mm.channels[channelId];
    return c ? ('~' + c.name) : `chan:${channelId}`;
};
const name = ({ctx, id}) => {
    ctx = (ctx /*:Context_t*/);
    let suffix = '';
    if (id.endsWith('/owners')) {
        id = id.replace('/owners', '');
        suffix = '/owners';
    }
    const c = ctx.mm.channels[id];
    const u = ctx.mm.users[id];
    if (c) {
        return '~' + c.name + suffix;
    } else if (u) {
        if (suffix) { throw new Error("User with an owners group"); }
        return u.username;
    } else {
        return `unknown:${id}${suffix}`;
    }
};
const listObj = (list /*:string[]*/) /*:{[string]:number}*/ => {
    const obj = {};
    for (const x of list) { obj[x] = 1; }
    return obj;
};



const reply = (ctx, reply, m /*:Message_t*/) => {
    ctx.mm.postMessage(m.data.sender_name + ' ' + reply, m.broadcast.channel_id);
};
const ok = (ctx, m) => {
    ctx.mm.react(m._post.id, 'thumbsup');
};

const apiCall = (ctx, method, path, post, then) => {
    console.error('apiCall', method, path);
    ctx.mm._apiCall(method, path, post, (data, headers) => {
        console.error('apiCall', method, path, ' -- done');
        return then(data, headers);
    });
};

// https://your-mattermost-url.com/api/v4/channels/{channel_id}
const getChannelInfo = ({ctx, channelId, then}) => {
    apiCall(ctx, 'GET', `/channels/${channelId}`, null, (data, _header) => {
        console.log('GET channel info', data);
        if (data.error) {
            return void then(data);
        }
        then(null, data);
    });
};

const getChannelUsers = ({ctx, channelId, then}) => {
    // http://your-mattermost-url.com/api/v4/channels/{channel_id}/members
    const allData = [];
    const again = (p) => {
        apiCall(ctx, 'GET', `/channels/${channelId}/members?page=${p}`, null, (data, _header) => {
            if (data.error) {
                return void then(data);
            }
            if (data.length === 0) { return void then(null, allData); }
            Array.prototype.push.apply(allData, data);
            again(p + 1);
        });
    };
    again(0);
};


const emoji_party = '\uD83C\uDF89';

const addToChannel = ({ctx, channelId, userId, then}) => {
    const post = { user_id: userId, post_root_id: '', };
    apiCall(ctx, 'POST', `/channels/${channelId}/members`, post, (data, _header) => {
        if (data.error) {
            return void then(data.error);
        }
        then();
    });
};
const addAllToChannel = ({ctx, channelId, userIds, then}) => {
    ctx = (ctx /*:Context_t*/);
    userIds = (userIds /*:string[]*/);
    getChannelUsers({ctx, channelId, then: (err, data) => {
        if (err || !data) { return void then(err); }
        const errors = {};
        let nt = nThen;
        const existUsers = data.map((d) => d.user_id);
        userIds.filter((u) => existUsers.indexOf(u) === -1).forEach((u) => {
            nt = nt((w) => {
                addToChannel({ctx, channelId, userId:u, then:w((err) => {
                    if (err) {
                        errors[u] = err;
                    }
                })});
            }).nThen;
        });
        nt((_) => {
            if (Object.keys(errors).length === 0) {
                return void then();
            }
            const failedToInvite = ['Failed to invite some users:'];
            for (const id in errors) {
                failedToInvite.push('* ' + userName({ctx, userId:id}));
            }
            return void then(null, failedToInvite.join('\n'));
        });
    }});
};

const removeFromChannel = ({ctx, channelId, userId, then}) => {
    //http://your-mattermost-url.com/api/v4/channels/{channel_id}/members/{user_id}
    apiCall(ctx, 'DELETE', `/channels/${channelId}/members/${userId}`, null, (data, _header) => {
        console.log('DELETE user from channel', data);
        if (data.error) {
            return void then(data);
        }
        then();
    });
};
const removeAllExcept = ({ctx, channelId, userIds, then}) => {
    ctx = (ctx /*:Context_t*/);
    userIds = (userIds /*:string[]*/);
    getChannelUsers({ctx, channelId, then: (err, data) => {
        if (err || !data) { return void then(err); }
        const errors = {};
        let nt = nThen;
        console.log(data);
        const existUsers = data.map((d) => d.user_id);
        console.log(`there exist ${existUsers.length} users`);
        existUsers.forEach((u) => {
            if (u === ctx.mut.me) {
                console.log('keeping myself');
                return;
            }
            if (userIds.indexOf(u) !== -1) {
                console.log(`keeping ${userName({ctx, userId:u})} who is authorized`);
                return;
            }
            console.log(`removing ${userName({ctx, userId:u})}`);
            nt = nt((w) => {
                removeFromChannel({ctx, channelId, userId:u, then:w((err) => {
                    if (err) {
                        errors[u] = err;
                    }
                })});
            }).nThen;
        });
        nt((_) => {
            if (Object.keys(errors).length === 0) {
                return void then();
            }
            const failedToRemove = ['Failed to remove some users:'];
            for (const id in errors) {
                failedToRemove.push('* ' + userName({ctx, userId:id}));
            }
            return void then(null, failedToRemove.join('\n'));
        });
    }});
};






//// channel db management

const getUserMembers = ({ctx, channelId}) => {
    ctx = (ctx /*:Context_t*/);
    channelId = (channelId /*:string*/);
    const userMembers = {};
    if (!ctx.db._chans[channelId]) { return [ channelId ]; }
    const more = [ ctx.db._chans[channelId] ];
    while (more.length) {
        const m = more.pop();
        for (const id in m) {
            const c = ctx.db._chans[id];
            if (c) {
                more.push(c);
            } else {
                userMembers[id] = 1;
            }
        }
    }
    return Object.keys(userMembers);
};
const isMemberOf = ({ctx, channelId, userOrChannel}) => {
    ctx = (ctx /*:Context_t*/);
    channelId = (channelId /*:string*/);
    userOrChannel = (userOrChannel /*:string*/);
    const more = [ ctx.db._chans[channelId] ];
    while (more.length) {
        const m = more.pop();
        for (const id in m) {
            if (id === userOrChannel) {
                return true;
            } else {
                const c = ctx.db._chans[id];
                if (c) { more.push(c); }
            }
        }
    }
    return false;
};
const isOwnerOf = ({ctx, channelId, userOrChannel}) => {
    return isMemberOf({ctx, channelId: channelId + '/owners', userOrChannel});
};
const membershipJustifications = ({ctx, channelId, userOrChannel}) => {
    const out = [];
    for (const group in ctx.db._chans[channelId]) {
        if (group === userOrChannel) {
            out.push(userOrChannel);
        } else if (!ctx.db._chans[group]) {
            // it's just a plain user
        } else if (isMemberOf({ctx, channelId: group, userOrChannel})) {
            out.push(group);
        }
    }
    return out;
};
// const ownershipJustification = ({ctx, channelId, userOrChannel}) => {
//     return membershipJustification({ctx, channelId: channelId + '/owners', userOrChannel});
// };
const getDirectMembers = ({ctx, channelId}) => {
    ctx = (ctx /*:Context_t*/);
    return Object.keys(ctx.db._chans[channelId]);
};
const getDirectOwners = ({ctx, channelId}) => {
    ctx = (ctx /*:Context_t*/);
    return Object.keys(ctx.db._chans[channelId + '/owners']);
};
const isDirectMemberOf = ({ctx, channelId, userOrChannel}) => {
    ctx = (ctx /*:Context_t*/);
    return typeof(ctx.db._chans[channelId][userOrChannel]) === 'number';
};
const isDirectOwnerOf = ({ctx, channelId, userOrChannel}) => {
    userOrChannel = (userOrChannel /*:string*/);
    return isDirectMemberOf({ctx, channelId: channelId + '/owners', userOrChannel});
};
const isOwnersGroup = (channelId) => channelId.endsWith('/owners');
const chanExists = ({ctx, channelId}) => {
    ctx = (ctx /*:Context_t*/);
    return !!ctx.db._chans[channelId];
};
const subChannels = ({ctx, channelId, out}) => {
    ctx = (ctx /*:Context_t*/);
    for (const c in ctx.db._chans) {
        if (ctx.db._chans[c][channelId]) {
            out[c] = 1;
            subChannels({ctx, channelId: c, out});
        }
    }
};
const directSubchannels = ({ctx, channelId, out}) => {
    ctx = (ctx /*:Context_t*/);
    for (const c in ctx.db._chans) {
        if (ctx.db._chans[c][channelId]) {
            out[c] = 1;
        }
    }
    return out;
};

const appendLog = (ctx, obj) => {
    const date = (new Date()).toISOString().replace(/T.*$/, '');
    obj.unshift(Math.floor((+new Date()) / 1000));
    if (ctx.mut.aolDate !== date || !ctx.mut.aol) {
        if (ctx.mut.aol) { ctx.mut.aol.end(); }
        ctx.mut.aol = Fs.createWriteStream(`./eventlog-${date}.ndjson`, {flags:'a'});
        ctx.mut.aolDate = date;
    }
    ctx.mut.aol.write(JSON.stringify(obj) + '\n');
};
const writeDb = ({ctx, then}) => {
    Fs.writeFile('./db.json', JSON.stringify(ctx.db, null, '\t'), then);
};
const dropChan = ({ctx, channelId, then}) => {
    delete ctx.db._chans[channelId];
    delete ctx.db._chans[channelId + '/owners'];
    appendLog(ctx, ['dropChan', channelId]);
    writeDb({ctx, then});
};
const registerChan = ({ctx, channelId, members, owners, then}) => {
    ctx = (ctx /*:Context_t*/);
    if (chanExists({ctx, channelId})) {
        throw new Error(`Can't register channel ${chanName({ctx, channelId})} because it's already in the db`);
    }
    const lMem = listObj(members);
    const lOwn = listObj(owners);
    // owners are always members, no matter what
    lMem[channelId + '/owners'] = 1;
    delete lMem[ctx.mut.me];
    delete lOwn[ctx.mut.me];
    ctx.db._chans[channelId] = lMem;
    ctx.db._chans[channelId + '/owners'] = lOwn;
    appendLog(ctx, ['registerChan', channelId, members, owners]);
    writeDb({ctx, then});
};
const addOwners = ({ctx, channelId, userOrChannelIds, then}) => {
    // we need to remove the people from members and add them to owners because owners are implied members
    const owners = ctx.db._chans[channelId + '/owners'];
    const members = ctx.db._chans[channelId];
    for (const uc of userOrChannelIds) {
        if (uc === ctx.mut.me) { continue; }
        delete members[uc];
        owners[uc] = 1;
    }
    appendLog(ctx, ['addOwners', channelId, userOrChannelIds]);
    writeDb({ctx, then});
};
const removeOwners = ({ctx, channelId, userOrChannelIds, then}) => {
    const owners = ctx.db._chans[channelId + '/owners'];
    const members = ctx.db._chans[channelId];
    for (const uc of userOrChannelIds) {
        delete owners[uc];
        members[uc] = 1;
    }
    appendLog(ctx, ['removeOwners', channelId, userOrChannelIds]);
    writeDb({ctx, then});
};
const addMembers = ({ctx, channelId, userOrChannelIds, then}) => {
    const members = ctx.db._chans[channelId];
    for (const uc of userOrChannelIds) {
        if (uc === ctx.mut.me) { continue; }
        members[uc] = 1;
    }
    appendLog(ctx, ['addMembers', channelId, userOrChannelIds]);
    writeDb({ctx, then});
};
const removeMembers = ({ctx, channelId, userOrChannelIds, then}) => {
    const members = ctx.db._chans[channelId];
    for (const uc of userOrChannelIds) {
        if (uc === channelId + '/owners') { continue; }
        delete members[uc];
    }
    appendLog(ctx, ['removeMembers', channelId, userOrChannelIds]);
    writeDb({ctx, then});
};

//// end of channel db management




const iWasRemoved = ({ctx, channelId, removedBy}) => {
    ctx = (ctx /*:Context_t*/);
    if (!chanExists({ctx, channelId})) {
        console.error(`I was removed from a channel ${chanName({ctx, channelId})} of which I have no record`);
        return;
    }
    addToChannel({ctx, channelId, userId: ctx.mut.me, then: (err) => {
        if (err) {
            console.error(`I was removed from ${chanName({ctx, channelId})} by ` +
                ` ${userName({ctx, userId:removedBy})} and I can't get back in ${err}`);
        }
    }});
};

const thenLeave = ({ctx, channelId}) => {
    ctx = (ctx /*:Context_t*/);
    setTimeout(() => {
        removeFromChannel({ctx, channelId, userId: ctx.mut.me, then:(err)=>{
            if (err) {
                console.error(`Error leaving channel ${channelId}`);
            }
        }});
    }, 1000);
};

const iWasAdded = ({ctx, whoAddedMe, channelId}) => {
    ctx = (ctx /*:Context_t*/);
    if (chanExists({ctx, channelId})) {
        console.error(`I was added to channel ${chanName({ctx, channelId})} which I already know about`);
        return;
    }
    let channelInfo;
    nThen((w) => {
        getChannelInfo({ ctx, channelId, then: w((err, info) => {
            if (err || !info) {
                w.abort();
                console.error("Error getting channel info", JSON.stringify(err));
                ctx.mm.postMessage("Error getting channel info", channelId);
                thenLeave({ctx, channelId});
                return;
            }
            console.error('Got channel info');
            channelInfo = info;
            ctx.mm.channels[info.id] = info;
        })});
    }).nThen((w) => {
        if (!channelInfo) {
            console.error("For some reason channelInfo is missing");
            return;
        }
        if (channelInfo.creator_id !== whoAddedMe) {
            w.abort();
            ctx.mm.postMessage(`I can only manage this channel if I'm invited ` +
                `by the channel founder ${userName({ctx, userId: channelInfo.creator_id})}, ` +
                `I am going to leave now.`, channelId);
            thenLeave({ctx, channelId});
            return;
        } else if (channelInfo.type !== 'P') {
            w.abort();
            ctx.mm.postMessage(`I can only manage channels which are set to private mode, ` +
                `I am going to leave now.`, channelId);
            thenLeave({ctx, channelId});
            return;
        }
        console.error('getting channel users');
        getChannelUsers({ctx, channelId, then:w((err, users) => {
            if (err || !users) {
                w.abort();
                console.error("Error getting channel info", JSON.stringify(err));
                ctx.mm.postMessage("Error getting channel member list", channelId);
                thenLeave({ctx, channelId});
                return;
            }
            
            const members = [];
            for (const u of users) {
                if (u.user_id !== whoAddedMe) {
                    members.push(u.user_id);
                }
            }
            registerChan({ctx, channelId, members, owners:[ whoAddedMe ], then: w((err) => {
                if (err) {
                    console.error("Error getting channel info", JSON.stringify(err));
                    ctx.mm.postMessage("Error storing database", channelId);
                    return;
                }
                ctx.mm.postMessage("This channel is now a managed group " + emoji_party, channelId);
            })});
        })});
    });
};

const userWasAdded = (ctx, m) => {
    const channelId = m._post.channel_id;
    const userId = m._post.props.addedUserId;
    const addedBy = m._post.props.userId;
    if (addedBy === ctx.mut.me) { return; }
    if (userId === ctx.mut.me) { return void iWasAdded({ctx, whoAddedMe: addedBy, channelId}); }
    if (!chanExists({ctx, channelId})) {
        // Getting messages about channels we don't track
        console.error(`Spurious add of ${userName({ctx, userId})} to ${chanName({ctx, channelId})}`);
        return;
    }
    ctx.mm.postMessage(`@${userName({ctx, userId: addedBy})} This is a managed room, ` +
        `you must be an owner and use !add to add users to it`, channelId);
    removeFromChannel({ctx, channelId, userId, then:(err) => {
        if (err) {
            console.error(`Error removing user ${userName({ctx, userId: addedBy})}: ${String(err)}`);
        }
    }});
};
const rmUser = (ctx, m) => {
    const cn = m.data.channel_id;
    const uid = m.broadcast.user_id;
    const rmBy = m.data.remover_id;
    if (rmBy === ctx.mut.me) { return; }
    if (uid === ctx.mut.me) { return void iWasRemoved({ctx, channelId:cn, removedBy: rmBy}); }
    if (!chanExists({ctx, channelId:cn})) {
        // Getting messages about channels we don't track
        console.error(`Spurious removal of ${userName({ctx, userId:uid})} from ${chanName({ctx, channelId:cn})}`);
        return;
    }
    // user removed, whatever
    // maybe in the future we will consider this important and handle it
    console.error(`${userName({ctx, userId:uid})} was removed from ${chanName({ctx, channelId:cn})}`);
};

const addAuthorized = ({ctx, channelId, then}) => {
    const members = getUserMembers({ctx, channelId});
    Array.prototype.push.apply(members, getUserMembers({ctx, channelId: channelId + '/owners'}));
    addAllToChannel({ctx, channelId, userIds:[...new Set(members)], then});
};
const removeUnauthorized = ({ctx, channelId, then}) => {
    const members = getUserMembers({ctx, channelId});
    Array.prototype.push.apply(members, getUserMembers({ctx, channelId: channelId + '/owners'}));
    removeAllExcept({ctx, channelId, userIds:[...new Set(members)], then});
};

const chan = (ctx /*:Context_t*/, words /*:Array<string>*/, m /*:Message_t*/) => {
    const chan = ctx.mm.getChannelByID(m._post.channel_id);
    let name = words.join('').trim().replace(/[^a-zA-Z0-9_]/g, '_');
    let displayName = name;
    if (!name) {
        name = Crypto.randomBytes(16).toString('hex');
        displayName = 'temp';
    }
    const owners = [];
    const members = [];
    if (chan.type === 'D') {
        // From a direct message, there's nothing to copy, the sender of the message becomes owner.
        displayName = '#' + displayName;
        owners.push(m._post.user_id);
        members.push(m._post.user_id);
    } else if (chan.type === 'P') {
        displayName = chan.display_name + '-' + name;
        name = chan.name + '-' + name;
        owners.push(chan.id + '/owners');
        members.push(chan.id);
        if (!isOwnerOf({ctx, channelId: chan.id, userOrChannel: m._post.user_id})) {
            // important to give the channel creator autonamy over their sub-channel
            owners.push(m._post.user_id);
        }
    }
    const chanData = {
        team_id: m.data.team_id || ctx.mm.teamID,
        name,
        display_name: displayName,
        purpose: '',
        header: '',
        type: 'P',
    };
    let channelId;
    nThen((w) => {
        apiCall(ctx, 'POST', `/channels`, chanData, w((data, _header) => {
            if (data.error) {
                w.abort();
                if (data.error.indexOf('store.sql_channel.save_channel.exists.app_error') > -1) {
                    return void reply(ctx, `Cannot create channel because another channel ` +
                        `(perhaps deleted) exists with the same name`, m);
                }
                return void reply(ctx, `Error creating: ${data.error}`, m);
            }
            ctx.mm.channels[data.id] = data;
            channelId = data.id;
        }));
    }).nThen((w) => {
        registerChan({ctx, channelId, members, owners, then: w((err) => {
            if (err) {
                w.abort();
                return void reply(ctx, `Error committing database: ${String(err)}`, m);
            }
        })});
    }).nThen((w) => {
        addAuthorized({ctx, channelId, then:w((err, failures) => {
            if (err) {
                w.abort();
                return void reply(ctx, `Error inviting: ${String(err)}`, m);
            } else if (failures) {
                w.abort();
                return void reply(ctx, failures, m);
            }
        })});
    }).nThen((_) => {
        ok(ctx, m);
    });
};

const resolveGroup_UNKNOWN = {};
const resolveGroup_UNKNOWN_USER = {};
const resolveGroup_UNKNOWN_CHANNEL = {};
const resolveGroup_UNREGISTERED_CHANNEL = {};
const resolveGroup = ({ctx, word}) => {
    word = word.trim();
    let suffix = '';
    if (word.endsWith('/owners')) {
        word = word.replace('/owners', '');
        suffix = '/owners';
    }
    if (!suffix && word.indexOf('@') === 0) {
        // username
        return ctx.mut.userIdForName[word.slice(1)] || resolveGroup_UNKNOWN_USER;
    } else if (suffix || word.indexOf('#') === 0 || word.indexOf('~') === 0) {
        if (word.indexOf('#') === 0 || word.indexOf('~') === 0) { word = word.slice(1); }
        // channel
        const channelId = ctx.mut.channelIdForName[word];
        if (!channelId) {
            return resolveGroup_UNKNOWN_CHANNEL;
        }
        if (chanExists({ctx, channelId})) {
            // Only return the channel if it's recognized
            return channelId + suffix;
        }
        return resolveGroup_UNREGISTERED_CHANNEL;
    } else {
        const u = ctx.mut.userIdForName[word];
        if (u) { return u; }
        const c = ctx.mut.channelIdForName[word];
        if (c) { return c; }
        return resolveGroup_UNKNOWN;
    }
};

const resolveGroups = ({ctx, words, m, filter}) => {
    const ownersToAdd = [];
    for (const word of words) {
        const id = resolveGroup({ctx, word});
        if (id === resolveGroup_UNKNOWN_USER) {
            return void reply(ctx, `${word} is not a known user on the platform`, m);
        } else if (id === resolveGroup_UNKNOWN_CHANNEL) {
            return void reply(ctx, `${word} is not a known channel`, m);
        } else if (id === resolveGroup_UNREGISTERED_CHANNEL) {
            return void reply(ctx, `the channel ${word} not registered as a group`, m);
        } else if (id === resolveGroup_UNKNOWN) {
            return void reply(ctx, `${word} not known`, m);
        } else if (typeof(id) !== 'string') {
            throw new Error();
        } else if (filter(word, id) === false) {
            return;
        } else {
            ownersToAdd.push(id);
        }
    }
    return ownersToAdd;
};

const checkAuth = (ctx /*:Context_t*/, channelId, m /*:Message_t*/) => {
    if (!chanExists({ctx, channelId})) {
        reply(ctx, `cannot perform this action as this channel is not a managed group`, m);
        return false;
    } else if (!isOwnerOf({ctx, channelId, userOrChannel: m._post.user_id})) {
        reply(ctx, `you do not have permission to perform this action`, m);
        return false;
    }
    return true;
};

const areYouSure = (words) => {
    let yes = false;
    for (let i = words.length - 1; i >= 0; i--) {
        if (words[i].toLowerCase() === '-yes') {
            words.splice(i, 1);
            yes = true;
        }
    }
    return yes;
};

const deop = (ctx /*:Context_t*/, words /*:Array<string>*/, m /*:Message_t*/) => {
    const channelId = m._post.channel_id;
    if (!checkAuth(ctx, channelId, m)) { return; }
    const yes = areYouSure(words);
    const ownersToRemove = resolveGroups({ctx, words, m, filter: (word, id) => {
        if (!isDirectOwnerOf({ctx, channelId, userOrChannel: id})) {
            reply(ctx, `${word} is not an owner`, m);
        } else {
            return true;
        }
        return false;
    }});
    if (!ownersToRemove) { return; }
    const owners = listObj(getDirectOwners({ctx, channelId}));
    for (const o of ownersToRemove) {
        delete owners[o];
    }
    if (!Object.keys(owners).length) {
        return void reply(ctx, `This action would result in the channel having no owners ` +
            `use !del to delete the channel instead.`, m);
    }
    if (!yes) {
        let retainsOwnership = false;
        for (const o in owners) {
            if (isMemberOf({ctx, channelId: o, userOrChannel: m._post.user_id})) {
                retainsOwnership = true;
                break;
            }
        }
        if (!retainsOwnership) {
            return void reply(ctx, `This action would cause you to lose ownership of the channel ` +
                `use -yes flag if you're completely sure you want to do this.`, m);
        }
    }
    removeOwners({ctx, channelId, userOrChannelIds: ownersToRemove, then: (err) => {
        if (err) {
            return void reply(ctx, `Error storing database: ${String(err)}`, m);
        } else {
            return void ok(ctx, m);
        }
    }});
};

const inviteToSubchannels = ({ctx, channelId, m}) => {
    // Careful, each channel has sub-channels and there are members who may already have reason to
    // be present and members who will gain reason to be present
    const channels = {};
    subChannels({ctx, channelId, out:channels});
    const chanList = Object.keys(channels);
    chanList.unshift(channelId);

    let nt = nThen;
    const errors = [];
    chanList.forEach((chanId) => {
        nt = nt((w) => {
            console.error(`Inviting to ${chanName({ctx, channelId:chanId})}`);
            addAuthorized({ctx, channelId:chanId, then: w((err, failures) => {
                if (!err && failures) {
                    err = failures;
                }
                if (err) {
                    errors.push(`Inviting to ${chanName({ctx, channelId:chanId})} ` + err);
                }
            })});
        }).nThen;
    });
    nt((w) => {
        if (errors.length) {
            w.abort();
            return void reply(ctx, errors.join('\n'), m);
        }
    }).nThen((_) => {
        ok(ctx, m);
    });
};

const op = (ctx /*:Context_t*/, words /*:Array<string>*/, m /*:Message_t*/) => {
    const channelId = m._post.channel_id;
    if (!checkAuth(ctx, channelId, m)) { return; }
    const ownersToAdd = resolveGroups({ctx, words, m, filter: (word, id) => {
        if (isDirectOwnerOf({ctx, channelId, userOrChannel: id})) {
            reply(ctx, `${word} is already an owner`, m);
        } else if (isMemberOf({ctx, channelId:id, userOrChannel:channelId + '/owners'})) {
            reply(ctx, `This channel's owner group is a member of ${word} so we cannot make ${word} also ` +
                `a member of this channel's owner group without creating a circular definition`, m);
        } else {
            return true;
        }
        return false;
    }});
    if (!ownersToAdd) { return; }
    addOwners({ctx, channelId, userOrChannelIds: ownersToAdd, then: (err) => {
        if (err) {
            return void reply(ctx, `Error storing database: ${String(err)}`, m);
        } else {
            inviteToSubchannels({ctx, channelId, m});
        }
    }});
};

const printMembershipJustifications = ({ctx, channelId, userOrChannel}) => {
    return membershipJustifications({ctx, channelId, userOrChannel}).map((id) => {
        return id === userOrChannel ? '*direct membership*' : name({ctx, id});
    });
};

const add = (ctx /*:Context_t*/, words /*:Array<string>*/, m /*:Message_t*/) => {
    const channelId = m._post.channel_id;
    if (!checkAuth(ctx, channelId, m)) { return; }
    const yes = areYouSure(words);
    const membersToAdd = resolveGroups({ctx, words, m, filter: (word, id) => {
        if (isDirectMemberOf({ctx, channelId, userOrChannel: id})) {
            reply(ctx, `${word} is already in this channel, perhaps they need an !invite ?`, m);
        } else if (!yes && isMemberOf({ctx, channelId, userOrChannel: id})) {
            const just = printMembershipJustifications({ctx, channelId, userOrChannel: id});
            reply(ctx, `${word} is already a member this channel via their membership` +
                ((just.length > 1) ? 's' : '') +
                `in ${just.join(', and ')}. ` +
                `Use the -yes flag if you are sure you want to add them again.`, m);
        } else if (isMemberOf({ctx, channelId:id, userOrChannel:channelId})) {
            reply(ctx, `This channel is a member of ${word} so we cannot make ${word} also ` +
                `a member of this channel without creating a circular definition`, m);
        } else {
            return true;
        }
        return false;
    }});
    if (!membersToAdd) { return; }

    nThen((w) => {
        addMembers({ctx, channelId, userOrChannelIds: membersToAdd, then: w((err) => {
            if (err) {
                w.abort();
                return void reply(ctx, `Error storing database: ${String(err)}`, m);
            }
        })});
    }).nThen((w) => {
        inviteToSubchannels({ctx, channelId, m});
    });
};

const remove = (ctx /*:Context_t*/, words /*:Array<string>*/, m /*:Message_t*/) => {
    const channelId = m._post.channel_id;
    if (!checkAuth(ctx, channelId, m)) { return; }
    const membersToRemove = resolveGroups({ctx, words, m, filter: (word, id) => {
        if (!isMemberOf({ctx, channelId, userOrChannel: id})) {
            reply(ctx, `${word} should not be in this channel`, m);
        } else if (!isDirectMemberOf({ctx, channelId, userOrChannel: id})) {
            reply(ctx, `${word} is not a direct member of this channel`, m);
        } else {
            return true;
        }
        return false;
    }});
    if (!membersToRemove) { return; }

    nThen((w) => {
        removeMembers({ctx, channelId, userOrChannelIds: membersToRemove, then: w((err) => {
            if (err) {
                w.abort();
                return void reply(ctx, `Error storing database: ${String(err)}`, m);
            }
        })});
    }).nThen((w) => {
        const channels = {};
        subChannels({ctx, channelId, out:channels});
        const chanList = Object.keys(channels);
        chanList.unshift(channelId);

        let nt = nThen;
        const errors = [];
        chanList.forEach((chanId) => {
            nt = nt((w) => {
                removeUnauthorized({ctx, channelId:chanId, then: w((err, failures) => {
                    if (!err && failures) {
                        err = failures;
                    }
                    if (err) {
                        errors.push(`Removing from ${chanName({ctx, channelId:chanId})} ` + err);
                    }
                })});
            }).nThen;
        });
        nt((w) => {
            if (errors.length) {
                w.abort();
                return void reply(ctx, errors.join('\n'), m);
            }
        }).nThen(w());
    }).nThen((_) => {
        ok(ctx, m);
    });
};

const info = (ctx /*:Context_t*/, words /*:Array<string>*/, m /*:Message_t*/) => {
    let channelId = m._post.channel_id;
    const userId = m._post.user_id;
    if (words.length) {
        const g = resolveGroup({ctx, word:words[0]});
        if (g === resolveGroup_UNKNOWN_USER) {
            return void reply(ctx, `${words[0]} is not a known user`, m);
        } else if (g === resolveGroup_UNKNOWN_CHANNEL) {
            return void reply(ctx, `${words[0]} is not a known channel`, m);
        } else if (g === resolveGroup_UNKNOWN_CHANNEL) {
            return void reply(ctx, `The channel ${words[0]} is not registered as a group`, m);
        } else if (g === resolveGroup_UNKNOWN) {
            return void reply(ctx, `${words[0]} is not known`, m);
        } else if (typeof(g) !== 'string') {
            throw new Error();
        } else if (!chanExists({ctx, channelId: g})) {
            return void reply(ctx, `${words[0]} seems to be a user ID, not a group`, m);
        } else if (isOwnersGroup(g)) {
            return void reply(ctx, `${words[0]} is an owners group, not a channel`, m);
        } else {
            channelId = g;
        }
    }

    if (!isMemberOf({ctx, channelId, userOrChannel: userId})) {
        return void reply(ctx, `You are not a member of ${chanName({ctx, channelId})}`, m);
    }

    const out = ['Channel info:', '* Owners'];
    for (const owner of getDirectOwners({ctx, channelId})) {
        console.error(`owner: ${owner} ${name({ctx, id:owner})}`);
        //const just = ownershipJustification({ctx, channelId, userOrChannel: owner});
        const just = printMembershipJustifications({
            ctx, channelId: channelId + '/owners', userOrChannel: owner}).filter((m) => {
            return m !== '*direct membership*';
        });
        const line = ['  * ', name({ctx, id:owner})];
        if (just.length) { line.push(' *also via* ', just.join(', *and* ')); }
        out.push(line.join(''));
    }
    out.push('* Members');
    for (const member of getDirectMembers({ctx, channelId})) {
        if (member === channelId + '/owners') { continue; }
        const just = printMembershipJustifications({ctx, channelId, userOrChannel: member}).filter((m) => {
            return m !== '*direct membership*';
        });
        const line = ['  * ', name({ctx, id:member})];
        if (just.length) { line.push(' *also via* ', just.join(', *and* ')); }
        out.push(line.join(''));
    }
    reply(ctx, out.join('\n'), m);
};

const allusers = (ctx /*:Context_t*/, words /*:Array<string>*/, m /*:Message_t*/) => {
    const out = [];
    let channelId = m._post.channel_id;
    if (words.length) {
        const cid = resolveGroup({ctx, word:words[0]});
        if (typeof(cid) !== 'string' || !chanExists({ctx, channelId:cid})) {
            return reply(ctx, `${words[0]} is not a known channel`, m);
        }
        channelId = cid;
    } else if (ctx.mm.getChannelByID(channelId).type === 'D') {
        out.push(`All users in system:`);
        for (const u in ctx.mut.userIdForName) {
            out.push('* **' + u + '**');
        }
        reply(ctx, out.join('\n'), m);
        return;
    }
    if (!isMemberOf({ctx, channelId, userOrChannel: m._post.user_id})) {
        return reply(ctx, `You must be a member of ${words[0]} channel to list membership`, m);
    } else {
        out.push(`Members of ${name({ctx, id:channelId})}:`);
        getUserMembers({ctx, channelId}).forEach((userId) => {
            const just = printMembershipJustifications({ctx, channelId, userOrChannel:userId});
            const line = ['* **', userName({ctx, userId}), '**'];
            line.push(' *via* ' + just.join(', *and* '));
            out.push(line.join(''));
        });
    }
    reply(ctx, out.join('\n'), m);
};

const evict = (ctx /*:Context_t*/, words /*:Array<string>*/, m /*:Message_t*/) => {
    const channelId = m._post.channel_id;
    if (!checkAuth(ctx, channelId, m)) { return; }
    removeUnauthorized({ctx, channelId, then: (err, failures) => {
        if (!err && failures) {
            err = failures;
        }
        if (err) {
            reply(ctx, `Error: ${err}`, m);
        } else {
            ok(ctx, m);
        }
    }});
};

const del = (ctx /*:Context_t*/, _words /*:Array<string>*/, m /*:Message_t*/) => {
    const channelId = m._post.channel_id;
    if (!checkAuth(ctx, channelId, m)) { return; }

    const channels = {};
    directSubchannels({ctx, channelId: channelId + '/owners', out:channels});
    directSubchannels({ctx, channelId, out:channels});
    delete channels[channelId];
    const chanList = Object.keys(channels);
    if (chanList.length) {
        const out = chanList.map((c) => `* ${name({ctx, id: c})}`);
        out.unshift(`Cannot delete ${chanName({ctx, channelId})} because there are channels which include it:`);
        out.push("You will need to delete them first");
        return void reply(ctx, out.join('\n'), m);
    }

    dropChan({ctx, channelId, then: (err) => {
        if (err) {
            return void reply(ctx, `Error deleting chan from db: ${String(err)}`, m);
        }
        apiCall(ctx, 'DELETE', `/channels/${channelId}`, null, (data, _header) => {
            console.log('DELETE channel ', data);
            if (data.error) {
                reply(ctx, `Error: ${data.error}`, m);
            }
            // we're not going to ok the message because the channel is about to disappear
        });
    }});
};

let COMMANDS;
const help = (ctx /*:Context_t*/, _words /*:Array<string>*/, m /*:Message_t*/) => {
    let out = [`To send a command, use: !<command> <arg1> <arg2> ...`];
    for (const c in COMMANDS) {
        out.push(`**!${c}**: ${COMMANDS[c].help}`);
    }
    reply(ctx, out.join('\n'), m);
};
COMMANDS = {
    chan:      { cmd: chan,   argc:  1, help: 'Create a new channel with the same permissions as the current'},
    op:        { cmd: op,     argc: -1, help: 'Add one or more owners to a channel'},
    deop:      { cmd: deop,   argc: -1, help: 'Remove one or more owners from a channel'},
    add:       { cmd: add,    argc: -1, help: 'Add one or more members to a channel'},
    remove:    { cmd: remove, argc: -1, help: 'Remove one or more members from a channel'},
    info:      { cmd: info,   argc: [0,1], help: 'Display information about the current channel, or a channel of your choice'},
    allusers:  { cmd: allusers, argc: [0,1], help: 'Print all users known to the bot, or all users authorized to a channel'},
    evict:     { cmd: evict,  argc: [0,1], help: 'Remove all users who are not authorized'},
    del:       { cmd: del,    argc:  0, help: 'Delete the current channel'},
    help:      { cmd: help,   argc:  0, help: 'Display this message' },
};

const message = (ctx, m /*:Message_t*/) => {
    if (m._post.type === 'system_add_to_channel') {
        return void userWasAdded(ctx, m);
    }
    const words = m._post.message.split(' ').filter((w) => w !== '');
    if (words.length < 1) {
        console.log('empty message');
        return;
    }
    if (words[0].indexOf('!') !== 0) { return; }
    const cmdName = words.shift().slice(1);
    const c = COMMANDS[cmdName];
    if (!c) {
        console.log(cmdName, 'is not a registered command');
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

const computeChannelNames = ({ctx}) => {
    const channelByName = {};
    for (const id in ctx.mm.channels) {
        channelByName[ctx.mm.channels[id].name] = id;
    }
    ctx.mut.channelIdForName = channelByName;
};

const connect = (ctx) => {
    ctx.mm.login(ctx.cfg.email, ctx.cfg.passwd);
    ctx.mm.on('loggedIn', () => {
        console.log('logged in');
    });
    ctx.mm.on('meLoaded', (me) => {
        //console.log(me);
        ctx.mut.me = me.id;
    });
    ctx.mm.on('profilesLoaded', () => {
        const idForName = {};
        for (const user in ctx.mm.users) {
            idForName[ctx.mm.users[user].username] = user;
        }
        ctx.mut.userIdForName = idForName;
    });
    let firstLoad = true;
    ctx.mm.on('channelsLoaded', () => {
        if (!firstLoad) { return; }
        firstLoad = false;
        computeChannelNames({ctx});
        for (const cid in ctx.mm.channels) {
            if (ctx.mm.channels[cid].type === 'D') { continue; }
            if (ctx.mm.channels[cid].name === 'town-square') { continue; }
            if (!chanExists({ctx, channelId:cid})) {
                ctx.mm.postMessage(`I'm sorry, I have no idea what I'm doing here, ` +
                    `I am going to leave now.`, cid);
                thenLeave({ctx, channelId:cid});
            }
            // TODO: Anyone in the channel who shouldn't be there -> throw them out
        }
    });
    ctx.mm.on('raw_message', (m) => {
        if (m.data && m.data.text && m.data.text === 'pong') {
        } else if ([
            'hello',
            'typing',
            'posted',
            'channel_viewed',
            'reaction_added',
            'status_change',
            'post_edited',
            'channel_deleted',
        ].indexOf(m.event) > -1) {
        } else {
            console.log('raw_message');
            console.log(m);
        }
    });
    ctx.mm.on('user_removed', (m) => rmUser(ctx, m));
    ctx.mm.on('channel_updated', (m) => {
        const c = JSON.parse(m.data.channel);
        const old = ctx.mm.channels[c.id];
        ctx.mm.channels[c.id] = c;
        if (old && old.name && ctx.mut.channelIdForName[old.name] === c.id) {
            delete ctx.mut.channelIdForName[old.name];
            ctx.mut.channelIdForName[c.name] = c.id;
        } else {
            // I'm confused, recompute everything.
            computeChannelNames({ctx});
        }
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
                return void message(ctx, m);
            }
        }
        console.log('unexpected message structure', m);
    });
};

const main = (config) => {
    process.env.MATTERMOST_LOG_LEVEL = 'notice';
    let db = {
        _chans: {},
    };
    nThen((w) => {
        Fs.readFile('./db.json', 'utf8', w((err, ret) => {
            if (err) {
                if (err.code === 'ENOENT') { return; }
                throw new Error("Failed to read db.json");
            }
            db = JSON.parse(ret);
        }));
    }).nThen((_) => {
        const ctx = Object.freeze({
            mm: new Mattermost(config.server, config.team, { wssPort: 443, httpPort: null }),
            cfg: config,
            db: db,
            mut: {
                userIdForName: {},
                channelIdForName: {},
                me: '_',
                aol: undefined,
                aolDate: undefined,
            }
        });
        connect(ctx);
    });
};
main(require('./config.js'));
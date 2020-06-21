/*@flow*/
const Spawn = require('child_process').spawn;

const clean = (s /*:string*/) => s.replace(/[^a-zA-Z0-9_]/g, '');
const quote = (s /*:string*/) => s.replace(/["\\]/g, '');

const chan = (ctx, u /*:string*/) => {
    if (!u.endsWith('/owners')) {
        ctx.chans[clean(u)] = `[color=green, shape=box, label="${quote(u)}"]`;
    }
    return u;
};

const user = (ctx, u) => {
    ctx.users[clean(u)] = `[color=blue, label="@${quote(u)}"]`;
    return u;
};

const node = (ctx, n) => {
    if (n.indexOf('~') === 0) {
        return chan(ctx, n);
    } else {
        return user(ctx, n);
    }
};

const link = (ctx, x, y) => {
    const owners = x.endsWith('/owners');
    if (owners) { x = x.replace('/owners', ''); }
    const owns = y.endsWith('/owners');
    if (owns) { y = y.replace('/owners', ''); }
    if (x === y) { return; }
    const linkStyle = ctx.edges[x + '|' + y] = ctx.edges[x + '|' + y] || {
        from: x,
        to: y,
        ownersOwn: 0,
        ownersMembers: 0,
        membersOwn: 0,
        membersMembers: 0,
    };
    if (owners && owns) {
        linkStyle.ownersOwn |= 1;
    } else if (owners) {
        linkStyle.ownersMembers |= 1;
    } else if (owns) {
        linkStyle.membersOwn |= 1;
    } else {
        linkStyle.membersMembers |= 1;
    }
};

const computeDot = (ctx) => {
    const chart = ['digraph G {'];
    for (const u in ctx.users) { chart.push(u + ctx.users[u]); }
    for (const c in ctx.chans) { chart.push(c + ctx.chans[c]); }
    for (const e in ctx.edges) {
        const dge = ctx.edges[e];
        const isUser = !ctx.chans[clean(dge.from)];

        const x = quote(dge.from);
        const y = quote(dge.to);
        let attr = [];
        if (isUser) {
            if (dge.membersOwn) {
                attr.push('color=red');
                attr.push(`tooltip="${x} is an owner of ${y}"`);
            } else {
                attr.push(`tooltip="${x} is a member of ${y}"`);
            }
        } else {
            attr.push('style=bold');
            if (dge.membersOwn) {
                attr.push('color=red');
                attr.push(`tooltip="every member of ${x} is an owner of ${y}"`);
            } else if (dge.ownersOwn) {
                if (dge.membersMembers) {
                    attr.push('color=green');
                    attr.push(`tooltip="owners and members of ${x} are owners and members of ${y} respectively"`);
                } else {
                    attr.push('color=pink');
                    attr.push(`tooltip="owners of ${x} are owners of ${y} but members of ${x} do not get privilege to join ${y}"`);
                }
            } else if (dge.membersMembers) {
                attr.push('color=brown');
                attr.push(`tooltip="all members of ${x} are members of ${y} but owners of ${x} have no special privileges in ${y}"`);
            } else if (dge.ownersMembers) {
                attr.push('color=blue');
                attr.push(`tooltip="owners of ${x} are allowed to join ${y} as non-owning members"`);
            } else {
                throw new Error("invalid state " + JSON.stringify(dge));
            }
        }
        chart.push(`${clean(dge.from)} -> ${clean(dge.to)}[${attr.join(', ')}]`);
    }
    chart.push('}');
    return chart.join('\n');
};

const dotToImg = (dot, then) => {
    const exe = Spawn('dot', ['-Tpng' ], { stdio: [ 'pipe', 'pipe', 'inherit' ] });
    const stdout = [];
    exe.stdout.on('data', (d) => { stdout.push(d); });
    console.log('spawn');
    exe.on('exit', (code) => {
        then(code, Buffer.concat(stdout));
    });
    exe.stdin.end(Buffer.from(dot, 'utf8'));
};

module.exports.makegraph = (
    dataset /*:Array<[string, string]>*/,
    then /*:(number, Buffer)=>void*/
) => {
    const ctx = {
        users: {},
        chans: {},
        edges: {},
    };
    for (const x of dataset) {
        link(ctx, node(ctx, x[0]), node(ctx, x[1]));
    }
    const dot = computeDot(ctx);
    dotToImg(dot, then);
};
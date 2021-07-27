
import reply from "./reply.js";
import wel from './welcome.js';

let COMMANDS;
let help = (ctx /*:Context_t*/, _words /*:Array<string>*/, m /*:Message_t*/) => {
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

export { COMMANDS, reply, help, wel };

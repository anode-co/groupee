const line = (db, text) => {
    if (text === '') { return; }
    const line = JSON.parse(text);
    switch (line[1]) {
        case 'registerChan': {
            const members = db._chans[line[2]] = {};
            const owners = db._chans[line[2] + '/owners'] = {};
            for (const m of line[3]) { members[m] = 1; }
            for (const o of line[4]) { owners[o] = 1; }
            return;
        }
        case 'dropChan': {
            delete db._chans[line[2]];
            delete db._chans[line[2] + '/owners'];
            return;
        }

        case 'addOwners': {
            const owners = db._chans[line[2] + '/owners'];
            for (const o of line[3]) { owners[o] = 1; }
            return;
        }
        case 'addMembers': {
            const members = db._chans[line[2]];
            for (const m of line[3]) { members[m] = 1; }
            return;
        }

        case 'removeOwners': {
            const owners = db._chans[line[2] + '/owners'];
            for (const o of line[3]) { delete owners[o]; }
            return;
        }
        case 'removeMembers': {
            const members = db._chans[line[2]];
            for (const m of line[3]) { delete members[m]; }
            return;
        }

        default: throw new Error("I don't know what to do with this line " + text);
    }
};

const main = () => {
    const db = { _chans: {} };
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    let lingeringLine = "";
    process.stdin.on('data', (chunk) => {
        const lines = chunk.split("\n");
        lines[0] = lingeringLine + lines[0];
        lingeringLine = lines.pop();
        for (const l of lines) { line(db, l); }
    });
    process.stdin.on('end', function() {
        line(db, lingeringLine);
        console.log(JSON.stringify(db, null, '\t'));
    });
};
main();
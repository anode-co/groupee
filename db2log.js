const DB = require('./db.json');
const now = () => Math.floor(+new Date() / 1000);
for (const ch in DB._chans) {
    if (ch.endsWith('/owners')) { continue; }
    console.log(JSON.stringify([now(), 'registerChan', ch, [] ]));
}
for (const ch in DB._chans) {
    if (ch.endsWith('/owners')) { continue; }
    console.log(JSON.stringify([now(), 'addMembers', ch, Object.keys(DB._chans[ch]) ]));
}
for (const ch in DB._chans) {
    if (!ch.endsWith('/owners')) { continue; }
    console.log(JSON.stringify([now(), 'addOwners', ch.replace('/owners', ''), Object.keys(DB._chans[ch]) ]));
}
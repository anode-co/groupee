import findUsers from "./findUsers";

const findUserMatchingBotAccount = async (ctx) => {
    const page = 0;

    let allUsers = [];
    let nextPage = null;
    let botMember;
    let botId = ctx.mut.botId;

    const findBot = (users) => {
        return users
        .find(u => u.id === botId);
    };

    do {
        let result;

        if (nextPage === null) {
            result = await findUsers(ctx, page);
        } else {
            result = await nextPage();
        }

        allUsers = allUsers.concat(result.users);
        nextPage = allUsers.concat(result.nextPage);

        const foundBot = findBot(allUsers);

        if (foundBot !== undefined) {
            botMember = foundBot;
            break;
        }
    }
    while (nextPage !== null);

    ctx.mut.users = allUsers;

    return new Promise((resolve, reject) => {
        if (botMember === undefined) {
            reject(`The configured bot account (see config.js) is not a system administrator.`);
            return;
        }

        resolve(botMember);
    });
};

export default findUserMatchingBotAccount;

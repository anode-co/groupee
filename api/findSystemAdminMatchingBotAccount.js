import findSystemAdministrators from "./findSystemAdministrators.js";

const findSystemAdminMatchingBotAccount = async (ctx) => {
    const systemAdministrators = await findSystemAdministrators(ctx);
    ctx.mut.systemAdministrators = systemAdministrators;

    return new Promise((resolve, reject) => {
        const botMember = systemAdministrators
            .find(m => m.id === ctx.mut.botId);

        if (botMember === undefined) {
            reject(`The configured bot account (see config.js) is not a system administrator.`);
            return;
        }

        resolve(botMember);
    });
};

export default findSystemAdminMatchingBotAccount;

import findTeamMembers from './findTeamMembers.js';

const findTeamAdminMatchingBotAccount = async (ctx, teamId) => {
    const teamMembers = await findTeamMembers(ctx, teamId);

    return new Promise((resolve, reject) => {
        if (
            !Array.isArray(teamMembers) ||
            teamMembers.length < 1
        ) {
            const errorMessage = `There is no member in this team (which team id is "${teamId}")`;
            ctx.info(errorMessage);
            reject(errorMessage);
            return;
        }

        const botMember = teamMembers
            .find(m => m.user_id === ctx.mut.botId && m.scheme_admin);

        if (botMember === undefined) {
            reject(`The configured bot account (see config.js) is not a team admin of team having id ${teamId}.`);
            return;
        }

        resolve(botMember);
    });
};

export default findTeamAdminMatchingBotAccount;
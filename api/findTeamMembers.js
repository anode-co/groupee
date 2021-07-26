
import makeApiCallPromise from './index.js';

const findTeamMembers = (ctx, teamId) => {
    return makeApiCallPromise(
        ctx,
        `/teams/${teamId}/members`,
        'GET',
        (members, resolve, _, reject) => {
            if (
                !Array.isArray(members) ||
                members.length < 1
            ) {
                const errorMessage = `There is no member in this team (which team id is "${teamId}")`;
                ctx.info(errorMessage);
                reject(errorMessage);
                return;
            }

            ctx.mut.teamMembers = members;
            resolve(members);
        }
    );
};

export default findTeamMembers;
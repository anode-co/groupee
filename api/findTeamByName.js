
import makeApiCallPromise from "./index.js";

const findTeamByName = (ctx /*:Context_t*/) /*: Promise<any>*/ => {
    return makeApiCallPromise(
        ctx,
        `/teams/name/${ctx.cfg.team}`,
        'GET',
        (team, resolve, _, reject) => {
            if (!team) {
                reject(`Invalid result for team having name ${ctx.cfg.team}`);
                return;
            }

            resolve(team);
        }
    );
};

export default findTeamByName;
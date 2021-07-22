
import makeApiCallPromise from "./index.js";

const findTeamByName = (ctx /*:Context_t*/) /*: Promise<any>*/ => {
    return makeApiCallPromise(
        ctx,
        `/teams/name/${ctx.cfg.team}`,
        'GET',
        (team, resolve, _, __) => resolve(team)
    );
};

export default findTeamByName;
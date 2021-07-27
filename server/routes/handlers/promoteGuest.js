
import {
    METHOD_POST,
    matchingRoute,
    sendResponse,
} from './index.js';

import {URLSearchParams} from 'url';
import urlUtils from "../../urlUtils.js";
import Routes from '../index.js';
import {
    findTeamMembers,
    promoteGuest,
    searchUserByTerm
} from "../../../api/index.js";

const handlePromoteGuest = ({ctx, method, request, response, config}) /*: Promise<any | void> */ => {
    return new Promise((resolve, _) => {
        let body = [];

        request.on('error', (err) => {
            ctx.error(`Error event emitted by request stream: "${err}"`);
        }).on('data', (chunk) => {
            body.push(chunk);
        }).on('end', async () => {
            body = Buffer.concat(body).toString();

            const requestUrl = urlUtils.requestUrl(config, request);
            const pathname = requestUrl.pathname;

            const routeMatches = matchingRoute(
                {method, pathname},
                {
                    expectedMethod: METHOD_POST,
                    expectedRoute: Routes.routes.ROUTE_PROMOTE_GUEST
                });

            const searchParams = new URLSearchParams(body);
            const params = Array.from(searchParams.keys())
                .reduce(
                    (acc, k) => {
                        acc[k] = searchParams.get(k);
                        return acc;
                    },
                    {}
                );

            const args = params.text.trim().split(' ');
            const username = args[0].substr(1, args[0].length - 1);

            const sendInvalidCommandResponse = () => sendResponse(
                response,
                {
                    response_type: "in_channel",
                    text: config.templatingParams.invalidPromoteGuestCommand
                        .replace('{{ username }}', username),
                }
            );

            const teamId = params.team_id;
            if (!teamId) {
                ctx.debug('Missing team id');
                sendInvalidCommandResponse();
                return;
            }

            let requester_id = params.user_id;
            if (typeof params.user_id === 'undefined') {
                ctx.debug('Missing id of promotion requester');
                sendInvalidCommandResponse();
                return;
            }

            const teamMembers = await findTeamMembers(ctx, teamId);
            const requester = teamMembers.find(teamMember => teamMember.user_id === requester_id);

            if (requester.scheme_guest) {
                ctx.info('Guests can not promote other guests');
                sendInvalidCommandResponse();
                return;
            }

            if (routeMatches) {
                try {
                    let {id: userId} = await searchUserByTerm(ctx, `${username}`);
                    await promoteGuest(ctx, userId);
                } catch(e) {
                    ctx.error('Could not promote guest', e);
                    sendInvalidCommandResponse();
                    return;
                }

                sendResponse(
                    response,
                    {
                        "response_type": "in_channel",
                        "text": config.templatingParams.promotedGuestSuccessfully
                            .replace('{{ username }}', username),
                    }
                );
            }

            resolve(routeMatches);
        });
    });
};

export default handlePromoteGuest;


import http from 'http';
import { URL } from 'url';

import {chainError, getMainChannelsNames} from "../api/index.js";
import {postTourMessage} from "../workflow/index.js";
import Routes from "./routes/index.js";

const METHOD_POST = 'POST';

const notFound = (response) => {
    response.statusCode = 404;
    response.statusMessage = 'Not found';
    response.end();
};

const matchingRoute = ({method, pathname}, {expectedMethod, expectedRoute}) => {
    return method === expectedMethod && expectedRoute === pathname;
};

const startServer = (ctx /*: Context_t */, config) => {
    const server = http.createServer((request, response) => {
        const { method } = request;

        const protocol = 'http://';
        const host = 'localhost';
        const port = config.serverPort === 80 ? '' : `:${config.serverPort}`;
        const requestUrl = new URL(request.url, `${protocol}${host}${port}`);
        const pathname = requestUrl.pathname;

        ctx.info({pathname});

        if (
            matchingRoute(
                {method, pathname},
                {
                    expectedMethod: METHOD_POST,
                    expectedRoute: Routes.routes.ROUTE_ACCEPT_RULES
                })
        ) {
            Routes.handlers.acceptRules(
                response,
                () => {
                    const teamId = requestUrl.searchParams.get('team_id');
                    if (!teamId) {
                        throw 'Team id is required to get main channel names';
                    }

                    const userId = requestUrl.searchParams.get('user_id');
                    if (!userId) {
                        throw 'User id is required to post a tour message.';
                    }

                    getMainChannelsNames(ctx, teamId)
                    .then(({mainChannelsNames}) => postTourMessage({ctx, mainChannelsNames, userId}), chainError)
                    .catch(e => ctx.error(`Could not post tour message for user having id ${userId}`, e));
                }
            );
            return;
        }

        notFound(response);
    });

    server.listen(config.serverPort, (error) => {
        if (error) {
            return error(error);
        }

        ctx.info(`Server listening on port ${config.serverPort}`);
    });

    return server;
};

export default {
    startServer,
    routes: Routes.routes
};

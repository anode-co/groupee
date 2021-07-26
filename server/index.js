
import http from 'http';

import Routes from "./routes/index.js";
import urlUtils from "./urlUtils.js";

const notFound = (response) => {
    response.statusCode = 404;
    response.statusMessage = 'Not found';
    response.end();
};

const startServer = (ctx /*: Context_t */, config) => {
    const server = http.createServer(async (request, response) => {
        const {method} = request;
        let routeMatches;

        routeMatches = Routes.Handlers.handleAcceptRules({
            ctx,
            config,
            method,
            request,
            response
        }) ||
        await Routes.Handlers.handlePromoteGuest({
            ctx,
            config,
            method,
            request,
            response
        });

        if (!routeMatches) {
            notFound(response);
        }
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
    routes: Routes.routes,
    urlUtils
};

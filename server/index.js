
import http from 'http';
import { URL } from 'url';

import routes from "./routes.js";
import actions from "../workflow/actions.js";

import disableUserAccount from "../api/disableUserAccount.js";

const METHOD_POST = 'POST';

const notFound = (response) => {
    response.statusCode = 404;
    response.statusMessage = 'Not found';
    response.end();
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
            method === METHOD_POST &&
            [
                routes.ROUTE_ACCEPT_RULES,
                routes.ROUTE_REJECT_RULES
            ].indexOf(pathname) !== -1
        ) {
            switch (pathname) {
                case routes.ROUTE_REJECT_RULES:

                    const userId = requestUrl.searchParams.get('user_id');
                    if (!userId) {
                        throw 'Can not disable user account without user id';
                    }

                    disableUserAccount(ctx, userId)
                    .catch(e => ctx.error('Could not disable user account: ', e));

                    break;
            }

            response.write(JSON.stringify({
                [actions.ACTION_ID_ACCEPT_RULES]: {
                    "message": "Thank you for having accepted the rules",
                    "props": {}
                },
                [actions.ACTION_ID_REJECT_RULES]: "Your account will be disabled. We're sorry to see you leave us.",
            }));
            response.end();
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
    routes
};

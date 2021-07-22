/*@flow*/

import http from 'http';
import { URL } from 'url';

import Mattermost from 'mattermost-client';

import routes from './server/routes.js';
import actions from './workflow/actions.js';
import Client from './client/index.js';

import config from './config.js';

const main = (config) => {
    process.env.MATTERMOST_LOG_LEVEL = process.env.MATTERMOST_LOG_LEVEL || 'notice';

    const client = new Mattermost(
        config.server,
        config.team,
        {
            wssPort: config.wssPort,
            httpPort: config.httpPort
        }
    );

    const logPrefix = 'GROUPEE';

    const debug = (...args) => {
        client.logger.debug(logPrefix, ...args);
    };

    const info = (...args) => {
        client.logger.info(logPrefix, ...args);
    };

    const error = (...args) => {
        client.logger.error(logPrefix, ...args);
    };
    
    const backtrace = () => {
        info({stack: (new Error()).stack});
    };

    const METHOD_POST = 'POST';

    const notFound = (response) => {
        response.statusCode = 404;
        response.statusMessage = 'Not found';
        response.end();
    };

    let ctx;

    const server = http.createServer((request, response) => {
        const { method } = request;

        const protocol = 'http://';
        const host = 'localhost';
        const port = config.serverPort === 80 ? '' : `:${config.serverPort}`;
        const requestUrl = new URL(request.url, `${protocol}${host}${port}`);
        const pathname = requestUrl.pathname;

        info({pathname});

        if (
            method === METHOD_POST &&
            [
                routes.ROUTE_ACCEPT_RULES,
                routes.ROUTE_REJECT_RULES
            ].indexOf(pathname) !== -1
        ) {
            switch (pathname) {
                case routes.ROUTE_REJECT_RULES:
                    // const params = Array.from(requestUrl.searchParams.keys())
                    // .reduce((acc, k) => {
                    //     acc[k] = requestUrl.searchParams.get(k);
                    //     return acc;
                    // }, {});

                    // info({params});

                    // postCommand(
                    //     ctx,
                    //     params.channel_id,
                    //     '/status I\'m disabling my account',
                    //     Object.assign(
                    //         {},
                    //         params
                    //     )
                    // )
                    // .then(result => info({command_execution_result: result}), chainError)
                    // .catch(e => error({command_execution_error: e}));

                    break;
            }

            response.write(JSON.stringify({
                [actions.ACTION_ID_ACCEPT_RULES]: "Thank you for having accepted the rules",
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

        info(`Server listening on port ${config.serverPort}`);
    });

    ctx = Object.freeze({
        server,
        mm: client,
        cfg: config,
        mut: {
            botId: '_',
            systemAdministrators: []
        },
        debug,
        info,
        error,
        backtrace
    });
    Client.connect(ctx);
};

main(config);

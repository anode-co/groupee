/*@flow*/

import Mattermost from 'mattermost-client';

import Client from './client/index.js';
import Server from './server/index.js';

import config from './config.js';

const main = async (config) => {
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
        error({stack: (new Error()).stack});
    };

    const ctx = Object.freeze({
        mm: client,
        cfg: config,
        mut: {
            botId: '_',
            botAccount: {},
            server: {},
        },
        debug,
        info,
        error,
        backtrace
    });
    Client.connect(ctx);
    ctx.mut.server = Server.startServer(ctx, config);
};

main(config);

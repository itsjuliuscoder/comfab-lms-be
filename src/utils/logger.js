import pino from 'pino';
import { config } from '../config/env.js';

export const logger = pino({
  level: config.logging.level,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
  base: {
    env: config.server.nodeEnv,
  },
});

export const createLogger = (context) => {
  return logger.child({ context });
};

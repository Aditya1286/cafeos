import pino from 'pino';
import { runtime, server } from '../config';

export const logger = pino({
  level: server.logLevel,
  transport: runtime.nodeEnv === 'production' ? undefined : { target: 'pino-pretty', options: { colorize: true } }
});

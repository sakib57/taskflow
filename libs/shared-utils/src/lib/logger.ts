import { LoggerService } from '@nestjs/common';
import * as winston from 'winston';

export function createLogger(serviceName: string): LoggerService {
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    defaultMeta: { service: serviceName },
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
    transports: [
      new winston.transports.Console({
        format:
          process.env.NODE_ENV === 'production'
            ? winston.format.json()
            : winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
              ),
      }),
    ],
  });

  return {
    log: (msg: any, ctx?: any) => logger.info(msg, ctx),
    error: (msg: any, trace?: any, ctx?: any) =>
      logger.error(msg, { trace, ...ctx }),
    warn: (msg: any, ctx?: any) => logger.warn(msg, ctx),
    debug: (msg: any, ctx?: any) => logger.debug(msg, ctx),
    verbose: (msg: any, ctx?: any) => logger.verbose(msg, ctx),
  };
}

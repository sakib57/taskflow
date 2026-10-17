import { LoggerService } from '@nestjs/common';

export function createLogger(serviceName: string): LoggerService {
  const format = (level: string, msg: any, ctx?: any) => {
    const timestamp = new Date().toISOString();
    const log: any = { timestamp, level, service: serviceName, message: msg };
    if (ctx) log.context = ctx;
    return JSON.stringify(log);
  };

  return {
    log: (msg: any, ctx?: any) => console.log(format('info', msg, ctx)),
    error: (msg: any, trace?: any, ctx?: any) =>
      console.error(format('error', msg, { trace, ...ctx })),
    warn: (msg: any, ctx?: any) => console.warn(format('warn', msg, ctx)),
    debug: (msg: any, ctx?: any) => {
      if (process.env.NODE_ENV !== 'production') {
        console.debug(format('debug', msg, ctx));
      }
    },
    verbose: (msg: any, ctx?: any) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log(format('verbose', msg, ctx));
      }
    },
  };
}

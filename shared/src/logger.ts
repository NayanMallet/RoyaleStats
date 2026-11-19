// Structured logger shared by every service.
//
// - Production (NODE_ENV=production): one JSON object per line, so that `docker compose logs`
//   can be filtered by requestId or level. Errors keep their full stack.
// - Development: a readable line, with the stack printed below errors.
// - The minimum level comes from LOG_LEVEL (debug | info | warn | error | fatal), and defaults
//   to `debug` in development and `info` in production.
// - The requestId of the current HTTP request is added automatically (see requestId.ts).

import { AsyncLocalStorage } from 'node:async_hooks';
import { format, inspect } from 'node:util';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

interface RequestContext {
  requestId: string;
}

/** Holds the requestId for everything that runs while a request is being handled. */
export const requestContext = new AsyncLocalStorage<RequestContext>();

let serviceName = process.env.SERVICE_NAME ?? 'unknown-service';

/** Names the service in every log line. Call it once, at the top of server.ts. */
export function configureLogger(options: { service: string }): void {
  serviceName = options.service;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function minimumLevel(): LogLevel {
  const configured = process.env.LOG_LEVEL?.toLowerCase();
  if (configured && configured in LEVEL_WEIGHT) return configured as LogLevel;
  return isProduction() ? 'info' : 'debug';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !(value instanceof Error) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/** Error → plain object, keeping the fields that help to diagnose (SQLite code, HTTP status…). */
export function serializeError(error: Error): Record<string, unknown> {
  const extra = error as Error & { code?: unknown; statusCode?: unknown; cause?: unknown };
  return {
    type: error.name,
    message: error.message,
    ...(extra.code !== undefined && { code: extra.code }),
    ...(extra.statusCode !== undefined && { statusCode: extra.statusCode }),
    stack: error.stack,
    ...(extra.cause instanceof Error && { cause: serializeError(extra.cause) }),
  };
}

function write(level: LogLevel, message: string, args: unknown[]): void {
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[minimumLevel()]) return;

  const error = args.find((arg): arg is Error => arg instanceof Error);
  const fields = Object.assign({}, ...args.filter(isPlainObject)) as Record<string, unknown>;
  // An explicit requestId field wins: callbacks such as res.on('finish') may run outside the
  // request's async context.
  const requestId =
    (typeof fields.requestId === 'string' ? fields.requestId : undefined) ??
    requestContext.getStore()?.requestId;
  delete fields.requestId;
  const rest = args.filter((arg) => arg !== error && !isPlainObject(arg));
  const stream = LEVEL_WEIGHT[level] >= LEVEL_WEIGHT.error ? process.stderr : process.stdout;

  if (isProduction()) {
    const line = {
      level,
      time: new Date().toISOString(),
      service: serviceName,
      ...(requestId && { requestId }),
      msg: rest.length ? format(message, ...rest) : message,
      ...fields,
      ...(error && { err: serializeError(error) }),
    };
    stream.write(`${JSON.stringify(line)}\n`);
    return;
  }

  const prefix = `[${level.toUpperCase()}] ${new Date().toISOString()} [${serviceName}]`;
  const context = requestId ? ` [req ${requestId}]` : '';
  const details = Object.keys(fields).length
    ? ` ${inspect(fields, { breakLength: Infinity })}`
    : '';
  const errorText = error ? `\n${error.stack ?? `${error.name}: ${error.message}`}` : '';
  stream.write(`${prefix}${context} ${format(message, ...rest)}${details}${errorText}\n`);
}

export const logger = {
  debug: (message: string, ...args: unknown[]) => write('debug', message, args),
  info: (message: string, ...args: unknown[]) => write('info', message, args),
  warn: (message: string, ...args: unknown[]) => write('warn', message, args),
  error: (message: string, ...args: unknown[]) => write('error', message, args),
  fatal: (message: string, ...args: unknown[]) => write('fatal', message, args),
};

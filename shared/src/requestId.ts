// Request correlation: the API Gateway creates an x-request-id for each incoming request (or
// keeps the one sent by the client), forwards it to the services, and every service logs it.
// `docker compose logs | grep <requestId>` then follows one request across the whole stack.

import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { logger, requestContext } from './logger';

export const REQUEST_ID_HEADER = 'x-request-id';

// Accept a client-provided id only if it is short and harmless (no log or header injection).
const VALID_REQUEST_ID = /^[\w-]{8,128}$/;

/**
 * Headers to add to a call to another service, so that its logs carry the same requestId:
 *   fetch(url, { headers: requestIdHeaders() })
 */
export function requestIdHeaders(): Record<string, string> {
  const requestId = requestContext.getStore()?.requestId;
  return requestId ? { [REQUEST_ID_HEADER]: requestId } : {};
}

/** The requestId of the current request, set by requestIdMiddleware. */
export function getRequestId(res: Response): string {
  return (res.locals.requestId as string | undefined) ?? 'unknown';
}

export function requestIdMiddleware(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const incoming = req.get(REQUEST_ID_HEADER);
    const requestId = incoming && VALID_REQUEST_ID.test(incoming) ? incoming : randomUUID();

    res.locals.requestId = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);
    requestContext.run({ requestId }, next);
  };
}

/** One structured log line per request once the response is sent (replaces morgan). */
export function requestLoggerMiddleware(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      const fields = {
        requestId: getRequestId(res),
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Math.round(durationMs),
      };
      const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${fields.durationMs} ms`;
      // Health checks run every few seconds: keep them out of the default log level.
      // Failed requests are `warn`: the error handler already logs the error itself, with its stack.
      if (req.path === '/health') logger.debug(message, fields);
      else if (res.statusCode >= 400) logger.warn(message, fields);
      else logger.info(message, fields);
    });

    next();
  };
}

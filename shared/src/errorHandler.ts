// Shared Express error handling: every error leaves a service in the same shape (ApiError).
//
//            | development                          | production
//   4xx      | business message + details           | business message (+ details for a 400)
//   5xx      | real message + stack + details       | generic message + requestId only
//
// The full error, stack included, is always written to the logs with the same requestId.

import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import { AppError, InternalServerError, NotFoundError, ValidationError } from './errors';
import { logger } from './logger';
import { getRequestId } from './requestId';
import { fromSqliteError, isSqliteError } from './sqliteErrors';
import type { ApiError } from './types';

const GENERIC_SERVER_MESSAGE = 'Une erreur interne est survenue.';

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function httpStatusOf(error: unknown): number | undefined {
  const candidate = error as { status?: unknown; statusCode?: unknown };
  const status = candidate?.statusCode ?? candidate?.status;
  return typeof status === 'number' && status >= 400 && status <= 599 ? status : undefined;
}

/** Any thrown value → AppError, so that the response never depends on what was thrown. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (isSqliteError(error)) return fromSqliteError(error);

  // Errors raised by Express itself (body-parser): invalid JSON, payload too large…
  const type = (error as { type?: unknown })?.type;
  if (type === 'entity.parse.failed') {
    return new ValidationError("Le corps de la requête n'est pas un JSON valide.", {
      cause: error,
    });
  }

  const status = httpStatusOf(error);
  if (status && status < 500) {
    const message = error instanceof Error ? error.message : 'Requête invalide.';
    return new AppError(status, 'BadRequest', message, { cause: error });
  }

  return new InternalServerError(GENERIC_SERVER_MESSAGE, { cause: error });
}

/** Builds the JSON body sent to the client, following the development/production table. */
export function toApiError(appError: AppError, requestId: string, original: unknown): ApiError {
  const production = isProduction();
  const serverError = !appError.isClientError;

  const body: ApiError = {
    error: appError.code,
    message: production && serverError ? GENERIC_SERVER_MESSAGE : appError.message,
    statusCode: appError.statusCode,
    requestId,
  };

  if (!production) {
    const details = appError.internalDetails ?? appError.details;
    if (details !== undefined) body.details = details;
    const source = original instanceof Error ? original : appError;
    if (serverError || source !== appError) body.stack = source.stack;
    if (serverError && source !== appError && source instanceof Error) {
      // The real cause, hidden behind the generic 500 in production.
      body.message = source.message || appError.message;
    }
  } else if (appError.statusCode === 400 && appError.details !== undefined) {
    body.details = appError.details;
  }

  return body;
}

export function createErrorHandler(): ErrorRequestHandler {
  return (error: unknown, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    const appError = toAppError(error);
    const requestId = getRequestId(res);
    const context = {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: appError.statusCode,
      error: appError.code,
    };

    if (appError.isClientError) {
      logger.warn(`${appError.code}: ${appError.message}`, context);
    } else {
      const logged = error instanceof Error ? error : appError;
      logger.error(`${req.method} ${req.originalUrl} failed`, context, logged);
    }

    res.status(appError.statusCode).json(toApiError(appError, requestId, error));
  };
}

/** Unknown route: answer the error contract instead of Express's HTML page. */
export function notFoundHandler(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    // The path stays out of the message: behind the Gateway it is the internal, rewritten path.
    next(
      new NotFoundError('Route introuvable.', {
        code: 'RouteNotFound',
        internalDetails: { method: req.method, path: req.originalUrl },
      }),
    );
  };
}

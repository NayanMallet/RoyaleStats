// Errors a service can throw from a route: the shared error handler turns them into the
// error contract (see docs/ERROR-HANDLING.md and the ApiError type).
//
//   throw new NotFoundError('Aucun joueur ne correspond à ce tag.', { code: 'PlayerNotFound' });
//
// `code` is the stable machine-readable name sent as `error` (PascalCase); `message` must be
// readable by the user, because 4xx messages are sent as they are, in production too.

export interface AppErrorOptions {
  /** Overrides the default `error` code of the class, e.g. `PlayerNotFound`. */
  code?: string;
  /** Data the client can use, e.g. the invalid fields of a 400: sent in production too. */
  details?: unknown;
  /** Diagnostic data (SQLite code, upstream status…): sent in development only, always logged. */
  internalDetails?: unknown;
  /** The original error, logged with the stack but never sent in production. */
  cause?: unknown;
}

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;
  readonly internalDetails?: unknown;

  constructor(statusCode: number, code: string, message: string, options: AppErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = options.code ?? code;
    this.statusCode = statusCode;
    this.code = options.code ?? code;
    this.details = options.details;
    this.internalDetails = options.internalDetails;
  }

  /** Client errors carry a message meant for the user; server errors never leak theirs. */
  get isClientError(): boolean {
    return this.statusCode < 500;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super(400, 'ValidationError', message, options);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentification requise.', options?: AppErrorOptions) {
    super(401, 'AuthenticationError', message, options);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Action non autorisée.', options?: AppErrorOptions) {
    super(403, 'Forbidden', message, options);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Ressource introuvable.', options?: AppErrorOptions) {
    super(404, 'NotFound', message, options);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super(409, 'ConflictError', message, options);
  }
}

export class RateLimitedError extends AppError {
  constructor(
    message = 'Trop de requêtes, réessayez dans quelques secondes.',
    options?: AppErrorOptions,
  ) {
    super(429, 'RateLimited', message, options);
  }
}

/** A dependency (another service, the Clash Royale API, the database) failed or is unreachable. */
export class UpstreamError extends AppError {
  constructor(
    statusCode: 502 | 503 | 504 = 502,
    message = 'Service momentanément indisponible, réessayez plus tard.',
    options?: AppErrorOptions,
  ) {
    const code =
      statusCode === 503
        ? 'ServiceUnavailable'
        : statusCode === 504
          ? 'GatewayTimeout'
          : 'BadGateway';
    super(statusCode, code, message, options);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Une erreur interne est survenue.', options?: AppErrorOptions) {
    super(500, 'InternalServerError', message, options);
  }
}

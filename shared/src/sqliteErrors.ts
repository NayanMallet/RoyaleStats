// Maps the errors thrown by better-sqlite3 (SqliteError, with a `code` such as
// SQLITE_CONSTRAINT_UNIQUE) to HTTP errors, so that a duplicate answers 409 instead of 500.
// Services do not need to import better-sqlite3 here: the error is recognised by its code.

import {
  AppError,
  ConflictError,
  InternalServerError,
  UpstreamError,
  ValidationError,
} from './errors';

interface SqliteLikeError extends Error {
  code: string;
}

export function isSqliteError(error: unknown): error is SqliteLikeError {
  return (
    error instanceof Error &&
    typeof (error as { code?: unknown }).code === 'string' &&
    (error as SqliteLikeError).code.startsWith('SQLITE_')
  );
}

export function fromSqliteError(error: SqliteLikeError): AppError {
  // Raw SQLite code and message: development only, never in a production response.
  const options = {
    internalDetails: { sqliteCode: error.code, sqliteMessage: error.message },
    cause: error,
  };

  switch (error.code) {
    case 'SQLITE_CONSTRAINT_UNIQUE':
    case 'SQLITE_CONSTRAINT_PRIMARYKEY':
      return new ConflictError('Cette ressource existe déjà.', options);
    case 'SQLITE_CONSTRAINT_NOTNULL':
    case 'SQLITE_CONSTRAINT_CHECK':
    case 'SQLITE_CONSTRAINT_FOREIGNKEY':
      return new ValidationError('Les données envoyées sont incomplètes ou invalides.', options);
    case 'SQLITE_BUSY':
    case 'SQLITE_LOCKED':
      return new UpstreamError(503, undefined, options);
    default:
      return new InternalServerError(undefined, options);
  }
}

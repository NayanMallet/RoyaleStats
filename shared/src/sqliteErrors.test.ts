import { describe, expect, it } from 'vitest';
import { fromSqliteError, isSqliteError } from './sqliteErrors';

function sqliteError(code: string) {
  return Object.assign(new Error(`${code} message`), { name: 'SqliteError', code });
}

describe('fromSqliteError', () => {
  it.each([
    ['SQLITE_CONSTRAINT_UNIQUE', 409, 'ConflictError'],
    ['SQLITE_CONSTRAINT_PRIMARYKEY', 409, 'ConflictError'],
    ['SQLITE_CONSTRAINT_NOTNULL', 400, 'ValidationError'],
    ['SQLITE_CONSTRAINT_CHECK', 400, 'ValidationError'],
    ['SQLITE_BUSY', 503, 'ServiceUnavailable'],
    ['SQLITE_ERROR', 500, 'InternalServerError'],
  ])('maps %s to %i %s', (code, statusCode, errorCode) => {
    const error = fromSqliteError(sqliteError(code));

    expect(error.statusCode).toBe(statusCode);
    expect(error.code).toBe(errorCode);
    expect(error.internalDetails).toEqual({ sqliteCode: code, sqliteMessage: `${code} message` });
  });
});

describe('isSqliteError', () => {
  it('recognises better-sqlite3 errors by their code only', () => {
    expect(isSqliteError(sqliteError('SQLITE_BUSY'))).toBe(true);
    expect(isSqliteError(Object.assign(new Error('x'), { code: 'ECONNREFUSED' }))).toBe(false);
    expect(isSqliteError('SQLITE_BUSY')).toBe(false);
  });
});

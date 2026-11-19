import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { createErrorHandler, notFoundHandler } from './errorHandler';
import { ConflictError, NotFoundError, UpstreamError, ValidationError } from './errors';

const REQUEST_ID = '6f1c9e2a-0000-4000-8000-000000000000';

function mockResponse() {
  const res = { headersSent: false, locals: { requestId: REQUEST_ID } } as unknown as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function sqliteError(code: string, message: string) {
  return Object.assign(new Error(message), { name: 'SqliteError', code });
}

const req = { method: 'POST', originalUrl: '/users/register' } as Request;
const next = vi.fn() as NextFunction;

function handle(error: unknown) {
  const res = mockResponse();
  createErrorHandler()(error, req, res, next);
  const body = vi.mocked(res.json).mock.calls[0]?.[0];
  return { res, body };
}

beforeEach(() => {
  vi.spyOn(process.stdout, 'write').mockReturnValue(true);
  vi.spyOn(process.stderr, 'write').mockReturnValue(true);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('createErrorHandler in development', () => {
  beforeEach(() => vi.stubEnv('NODE_ENV', 'development'));

  it('sends the real message, the stack and the requestId for an unexpected error', () => {
    const { res, body } = handle(new Error('Cannot read properties of undefined'));

    expect(res.status).toHaveBeenCalledWith(500);
    expect(body).toMatchObject({
      error: 'InternalServerError',
      message: 'Cannot read properties of undefined',
      statusCode: 500,
      requestId: REQUEST_ID,
    });
    expect(body.stack).toContain('Cannot read properties of undefined');
  });

  it('keeps the code and the business message of an AppError', () => {
    const { res, body } = handle(
      new NotFoundError('Aucun joueur ne correspond à ce tag.', { code: 'PlayerNotFound' }),
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(body).toEqual({
      error: 'PlayerNotFound',
      message: 'Aucun joueur ne correspond à ce tag.',
      statusCode: 404,
      requestId: REQUEST_ID,
    });
  });

  it('maps a SQLite unique constraint to 409 and shows the SQLite code and message', () => {
    const { res, body } = handle(
      sqliteError('SQLITE_CONSTRAINT_UNIQUE', 'UNIQUE constraint failed: users.email'),
    );

    expect(res.status).toHaveBeenCalledWith(409);
    expect(body).toMatchObject({
      error: 'ConflictError',
      details: {
        sqliteCode: 'SQLITE_CONSTRAINT_UNIQUE',
        sqliteMessage: 'UNIQUE constraint failed: users.email',
      },
    });
  });

  it('maps an unexpected SQL error to 500 with its SQLite code', () => {
    const { res, body } = handle(sqliteError('SQLITE_ERROR', 'no such table: users'));

    expect(res.status).toHaveBeenCalledWith(500);
    expect(body).toMatchObject({
      error: 'InternalServerError',
      message: 'no such table: users',
      details: { sqliteCode: 'SQLITE_ERROR' },
    });
  });

  it('answers 400 for a JSON body that cannot be parsed', () => {
    const parseError = Object.assign(new SyntaxError('Unexpected token } in JSON'), {
      type: 'entity.parse.failed',
      status: 400,
    });

    const { res, body } = handle(parseError);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(body.error).toBe('ValidationError');
  });
});

describe('createErrorHandler in production', () => {
  beforeEach(() => vi.stubEnv('NODE_ENV', 'production'));

  it('hides the message, the stack and the details of an unexpected error', () => {
    const { res, body } = handle(new Error('connect ECONNREFUSED 10.0.0.4:3002 apiKey=secret'));

    expect(res.status).toHaveBeenCalledWith(500);
    expect(body).toEqual({
      error: 'InternalServerError',
      message: 'Une erreur interne est survenue.',
      statusCode: 500,
      requestId: REQUEST_ID,
    });
  });

  it('never sends the SQL of a database error', () => {
    const { body } = handle(sqliteError('SQLITE_ERROR', 'no such table: users'));

    expect(JSON.stringify(body)).not.toContain('users');
    expect(body.details).toBeUndefined();
    expect(body.stack).toBeUndefined();
  });

  it('keeps the business message of a 409 without its SQLite details', () => {
    const { res, body } = handle(
      sqliteError('SQLITE_CONSTRAINT_UNIQUE', 'UNIQUE constraint failed: users.email'),
    );

    expect(res.status).toHaveBeenCalledWith(409);
    expect(body).toEqual({
      error: 'ConflictError',
      message: 'Cette ressource existe déjà.',
      statusCode: 409,
      requestId: REQUEST_ID,
    });
  });

  it('keeps the details of a validation error, which the form needs', () => {
    const { body } = handle(
      new ValidationError('Champs invalides.', { details: { email: 'Format invalide' } }),
    );

    expect(body.details).toEqual({ email: 'Format invalide' });
  });

  it('keeps the message of an explicit upstream error', () => {
    const { res, body } = handle(new UpstreamError(503, 'Clash Royale est indisponible.'));

    expect(res.status).toHaveBeenCalledWith(503);
    expect(body).toMatchObject({ error: 'ServiceUnavailable', statusCode: 503 });
  });

  it('logs the full error as one JSON line with the stack and the same requestId', () => {
    handle(new Error('Boom'));

    const written = vi
      .mocked(process.stderr.write)
      .mock.calls.map(([chunk]) => String(chunk))
      .find((line) => line.includes('"level":"error"'));
    const entry = JSON.parse(written ?? '{}');

    expect(entry).toMatchObject({ requestId: REQUEST_ID, err: { message: 'Boom' } });
    expect(entry.err.stack).toContain('Error: Boom');
  });
});

describe('createErrorHandler', () => {
  it('delegates to Express when the response has already started', () => {
    const res = mockResponse();
    (res as { headersSent: boolean }).headersSent = true;
    const delegate = vi.fn();
    const error = new ConflictError('Déjà lié.');

    createErrorHandler()(error, req, res, delegate);

    expect(delegate).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('notFoundHandler', () => {
  it('forwards a 404 NotFoundError naming the route', () => {
    const forward = vi.fn();

    notFoundHandler()({ method: 'GET', originalUrl: '/nope' } as Request, mockResponse(), forward);

    const error = forward.mock.calls[0]?.[0];
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.message).toContain('GET /nope');
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import { getJwtSecret, requireAuth, verifyAccessToken } from './auth';
import { UnauthorizedError } from './errors';

afterEach(() => vi.unstubAllEnvs());

function run(authorization?: string) {
  const req = { get: vi.fn().mockReturnValue(authorization) } as unknown as Request;
  const res = { locals: {} } as Response;
  const next = vi.fn();
  requireAuth()(req, res, next);
  return { res, next };
}

describe('verifyAccessToken', () => {
  it('returns the user of a token signed with JWT_SECRET', () => {
    vi.stubEnv('JWT_SECRET', 'secret');
    const token = jwt.sign({ userId: 7, email: 'a@example.com' }, 'secret');

    expect(verifyAccessToken(token)).toEqual({ userId: 7, email: 'a@example.com' });
  });

  it.each([
    ['signed with another secret', () => jwt.sign({ userId: 7, email: 'a@b.c' }, 'other')],
    ['expired', () => jwt.sign({ userId: 7, email: 'a@b.c' }, 'secret', { expiresIn: -1 })],
    ['without user id', () => jwt.sign({ email: 'a@b.c' }, 'secret')],
  ])('rejects a token %s with a 401', (_label, makeToken) => {
    vi.stubEnv('JWT_SECRET', 'secret');

    expect(() => verifyAccessToken(makeToken())).toThrow(UnauthorizedError);
  });
});

describe('requireAuth', () => {
  it('stores the verified user in res.locals', () => {
    vi.stubEnv('JWT_SECRET', 'secret');
    const { res, next } = run(`Bearer ${jwt.sign({ userId: 3, email: 'c@d.e' }, 'secret')}`);

    expect(res.locals.user).toEqual({ userId: 3, email: 'c@d.e' });
    expect(next).toHaveBeenCalledOnce();
  });

  it('throws a 401 without Authorization header', () => {
    expect(() => run(undefined)).toThrow(UnauthorizedError);
  });
});

describe('getJwtSecret', () => {
  it('refuses to start in production without JWT_SECRET', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('JWT_SECRET', '');

    expect(() => getJwtSecret()).toThrow('JWT_SECRET must be set in production');
  });
});

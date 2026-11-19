// JWT verification shared by the services: the user-service signs the token at login, the other
// services only verify it with the same secret. The authenticated user comes from the verified
// token, never from an id sent by the client.

import jwt from 'jsonwebtoken';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { UnauthorizedError } from './errors';

export interface AuthenticatedUser {
  userId: number;
  email: string;
}

const DEVELOPMENT_SECRET = 'default_secret_change_in_production';

/** JWT_SECRET from the environment. Mandatory in production: a known default would let anyone sign tokens. */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  return DEVELOPMENT_SECRET;
}

export function verifyAccessToken(token: string): AuthenticatedUser {
  let payload: unknown;
  try {
    payload = jwt.verify(token, getJwtSecret());
  } catch (error) {
    throw new UnauthorizedError('Votre session a expiré, reconnectez-vous.', { cause: error });
  }

  const { userId, email } = (payload ?? {}) as Partial<AuthenticatedUser>;
  if (typeof userId !== 'number' || typeof email !== 'string') {
    throw new UnauthorizedError('Votre session a expiré, reconnectez-vous.');
  }
  return { userId, email };
}

/** Rejects the request with 401 unless it carries a valid `Authorization: Bearer <JWT>`. */
export function requireAuth(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.get('authorization');
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Connectez-vous pour accéder à cette page.');
    }
    res.locals.user = verifyAccessToken(header.slice('Bearer '.length));
    next();
  };
}

/** The user verified by requireAuth(). */
export function getAuthenticatedUser(res: Response): AuthenticatedUser {
  const user = res.locals.user as AuthenticatedUser | undefined;
  if (!user) throw new UnauthorizedError();
  return user;
}

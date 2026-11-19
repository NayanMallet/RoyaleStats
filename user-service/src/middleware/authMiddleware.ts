import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from 'shared';
import { verifyToken } from '../services/authService';

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Connectez-vous pour accéder à cette page.');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const decoded = verifyToken(token);

  // Attach user info to request
  (req as any).userId = decoded.userId;
  (req as any).userEmail = decoded.email;

  next();
}

import { Request, Response, NextFunction } from 'express';
import { logger } from 'shared';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  logger.error(`API Gateway error on ${req.method} ${req.path}:`, err);

  const statusCode = (err as any).statusCode || 500;
  res.status(statusCode).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred',
    statusCode,
  });
}

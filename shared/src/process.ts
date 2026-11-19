// Process-level failures: an error thrown outside of any request (timer, worker, forgotten
// promise) leaves the process in an unknown state. Log it as `fatal` and exit: Docker restarts
// the service (`restart: unless-stopped` in docker-compose.yml).

import type { Express, Request, Response } from 'express';
import { logger } from './logger';

let installed = false;

export function installProcessHandlers(): void {
  if (installed) return;
  installed = true;

  process.on('uncaughtException', (error) => {
    logger.fatal('Uncaught exception, the process stops', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logger.fatal('Unhandled promise rejection, the process stops', error);
    process.exit(1);
  });
}

/**
 * Demo routes for the error handling (docs/ERROR-HANDLING.md), mounted outside production only:
 * - GET /debug/crash                → an exception inside a request: 500 with the error contract,
 *                                     the service keeps answering on /health.
 * - GET /debug/crash?mode=process   → an exception outside any request: `fatal` log, the process
 *                                     exits and Docker restarts it.
 * In production the routes do not exist, so they answer 404.
 */
export function registerDebugRoutes(app: Express): void {
  if (process.env.NODE_ENV === 'production') return;

  app.get('/debug/crash', (req: Request, res: Response) => {
    if (req.query.mode === 'process') {
      setTimeout(() => {
        throw new Error('Demo crash outside of a request (GET /debug/crash?mode=process)');
      }, 100);
      res
        .status(202)
        .json({ message: 'The process will crash in 100 ms, then Docker restarts it.' });
      return;
    }
    throw new Error('Demo crash inside a request (GET /debug/crash)');
  });
}

import express from 'express';
import {
  createCorsMiddleware,
  createErrorHandler,
  notFoundHandler,
  registerDebugRoutes,
  requestIdMiddleware,
  requestLoggerMiddleware,
} from 'shared';
import userRoutes from './routes/users';

/** The Express app without the database start-up and listen(), so that tests can mount it. */
export function createApp() {
  const app = express();

  // Middleware: the request id comes first so that every log line and error carries it.
  app.use(requestIdMiddleware());
  app.use(requestLoggerMiddleware());
  app.use(createCorsMiddleware());
  app.use(express.json());

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'user-service',
      timestamp: new Date().toISOString(),
    });
  });

  // Routes
  app.use('/users', userRoutes);

  registerDebugRoutes(app);

  // Error handling (must be last): unknown routes, then the shared error contract.
  app.use(notFoundHandler());
  app.use(createErrorHandler());

  return app;
}

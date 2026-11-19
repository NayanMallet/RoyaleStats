import express from 'express';
import {
  createCorsMiddleware,
  createErrorHandler,
  notFoundHandler,
  registerDebugRoutes,
  requestIdMiddleware,
  requestLoggerMiddleware,
} from 'shared';
import clashRoutes from './routes/clash';

/** The Express app without listen(), so that tests can mount it. */
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
      service: 'clash-data-service',
      timestamp: new Date().toISOString(),
      apiKeyConfigured: !!process.env.CLASH_ROYALE_API_KEY,
    });
  });

  // Routes
  app.use('/', clashRoutes);

  registerDebugRoutes(app);

  // Error handling (must be last): unknown routes, then the shared error contract.
  app.use(notFoundHandler());
  app.use(createErrorHandler());

  return app;
}

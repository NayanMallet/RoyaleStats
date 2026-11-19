import express from 'express';
import dotenv from 'dotenv';
import {
  configureLogger,
  createCorsMiddleware,
  createErrorHandler,
  installProcessHandlers,
  logger,
  notFoundHandler,
  registerDebugRoutes,
  requestIdMiddleware,
  requestLoggerMiddleware,
} from 'shared';
import { initDatabase } from './database';
import metaRoutes from './routes/meta';
import { startWorker } from './worker';

dotenv.config();

configureLogger({ service: 'meta-tracker-service' });
installProcessHandlers();

const app = express();
const PORT = process.env.META_TRACKER_SERVICE_PORT || 3006;

// Middleware: the request id comes first so that every log line and error carries it.
app.use(requestIdMiddleware());
app.use(requestLoggerMiddleware());
app.use(createCorsMiddleware());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'meta-tracker-service',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/', metaRoutes);

registerDebugRoutes(app);

// Error handling (must be last): unknown routes, then the shared error contract.
app.use(notFoundHandler());
app.use(createErrorHandler());

// Initialize database and start server
async function start() {
  try {
    await initDatabase();

    app.listen(PORT, () => {
      logger.info(`🚀 Meta Tracker Service listening on port ${PORT}`);
      startWorker();
    });
  } catch (error) {
    logger.fatal('Failed to start Meta Tracker Service:', error);
    process.exit(1);
  }
}

start();

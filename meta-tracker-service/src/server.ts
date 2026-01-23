import express from 'express';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createCorsMiddleware, logger } from 'shared';
import { initDatabase } from './database';
import metaRoutes from './routes/meta';
import { startWorker } from './worker';

dotenv.config();

const app = express();
const PORT = process.env.META_TRACKER_SERVICE_PORT || 3006;

// Middleware
app.use(morgan('dev'));
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

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'InternalServerError',
    message: err.message || 'An unexpected error occurred',
  });
});

// Initialize database and start server
async function start() {
  try {
    await initDatabase();

    app.listen(PORT, () => {
      logger.info(`🚀 Meta Tracker Service listening on port ${PORT}`);
      startWorker();
    });
  } catch (error) {
    logger.error('Failed to start Meta Tracker Service:', error);
    process.exit(1);
  }
}

start();

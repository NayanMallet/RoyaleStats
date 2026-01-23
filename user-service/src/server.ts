import express from 'express';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createCorsMiddleware, logger } from 'shared';
import { initDatabase } from './database';
import userRoutes from './routes/users';

dotenv.config();

const app = express();
const PORT = process.env.USER_SERVICE_PORT || 3002;

// Middleware
app.use(morgan('dev'));
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
      logger.info(`🚀 User Service listening on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start User Service:', error);
    process.exit(1);
  }
}

start();

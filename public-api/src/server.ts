import express from 'express';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createCorsMiddleware, logger } from 'shared';
import publicRoutes from './routes/index';

dotenv.config();

const app = express();
const PORT = process.env.PUBLIC_API_PORT || 3001;

// Middleware
app.use(morgan('dev'));
app.use(createCorsMiddleware());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'public-api',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/', publicRoutes);

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'InternalServerError',
    message: err.message || 'An unexpected error occurred',
  });
});

app.listen(PORT, () => {
  logger.info(`🚀 Public API listening on port ${PORT}`);
});

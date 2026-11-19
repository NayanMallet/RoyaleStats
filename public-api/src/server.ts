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
import publicRoutes from './routes/index';

dotenv.config();

configureLogger({ service: 'public-api' });
installProcessHandlers();

const app = express();
const PORT = process.env.PUBLIC_API_PORT || 3001;

// Middleware: the request id comes first so that every log line and error carries it.
app.use(requestIdMiddleware());
app.use(requestLoggerMiddleware());
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

registerDebugRoutes(app);

// Error handling (must be last): unknown routes, then the shared error contract.
app.use(notFoundHandler());
app.use(createErrorHandler());

app.listen(PORT, () => {
  logger.info(`🚀 Public API listening on port ${PORT}`);
});

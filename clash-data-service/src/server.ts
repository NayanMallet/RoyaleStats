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
import clashRoutes from './routes/clash';

dotenv.config();

configureLogger({ service: 'clash-data-service' });
installProcessHandlers();

const app = express();
const PORT = process.env.CLASH_DATA_SERVICE_PORT || 3004;

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

app.listen(PORT, () => {
  logger.info(`🚀 Clash Data Service listening on port ${PORT}`);
  if (process.env.CLASH_ROYALE_API_KEY) {
    logger.info('✅ Clash Royale API key configured');
  } else {
    logger.warn('⚠️  Clash Royale API key NOT configured - service will not work');
  }
});

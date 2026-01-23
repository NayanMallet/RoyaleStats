import express from 'express';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createCorsMiddleware, logger } from 'shared';
import { proxies } from './proxy';
import { errorHandler } from './middleware/errorHandler';

import path from 'path';

// Load .env from workspace root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.API_GATEWAY_PORT || 3000;

// Middleware
app.use(morgan('dev'));
app.use(createCorsMiddleware());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
  });
});

// Route proxies to microservices
app.use('/api/users', proxies.users);
app.use('/api/items', proxies.items);
app.use('/api/clash', proxies.clash);
app.use('/api/link', proxies.link);
app.use('/api/meta', proxies.meta);
app.use('/api/public', proxies.public);
app.use('/api/royaleapi', proxies.royaleapi);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'RoyaleStats API Gateway',
    version: '1.0.0',
    routes: {
      users: '/api/users',
      items: '/api/items',
      clash: '/api/clash',
      link: '/api/link',
      meta: '/api/meta',
      public: '/api/public',
    },
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`🚀 API Gateway listening on port ${PORT}`);
  logger.info(`📡 Proxying to microservices:`);
  logger.info(`  - User Service: ${process.env.USER_SERVICE_URL || 'http://user-service:3002'}`);
  logger.info(`  - Item Service: ${process.env.ITEM_SERVICE_URL || 'http://item-service:3003'}`);
  logger.info(
    `  - Clash Data Service: ${process.env.CLASH_DATA_SERVICE_URL || 'http://clash-data-service:3004'}`,
  );
  logger.info(`  - Link Service: ${process.env.LINK_SERVICE_URL || 'http://link-service:3005'}`);
  logger.info(
    `  - Meta Tracker Service: ${process.env.META_TRACKER_SERVICE_URL || 'http://meta-tracker-service:3006'}`,
  );
  logger.info(`  - Public API: ${process.env.PUBLIC_API_URL || 'http://public-api:3001'}`);
});

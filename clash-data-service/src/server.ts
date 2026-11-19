import dotenv from 'dotenv';
import { configureLogger, installProcessHandlers, logger } from 'shared';
import { createApp } from './app';

dotenv.config();

configureLogger({ service: 'clash-data-service' });
installProcessHandlers();

const PORT = process.env.CLASH_DATA_SERVICE_PORT || 3004;

createApp().listen(PORT, () => {
  logger.info(`🚀 Clash Data Service listening on port ${PORT}`);
  if (process.env.CLASH_ROYALE_API_KEY) {
    logger.info('✅ Clash Royale API key configured');
  } else {
    logger.warn('⚠️  Clash Royale API key NOT configured - service will not work');
  }
});

import dotenv from 'dotenv';
import { configureLogger, getJwtSecret, installProcessHandlers, logger } from 'shared';
import { createApp } from './app';
import { initDatabase } from './database';

dotenv.config();

configureLogger({ service: 'link-service' });
installProcessHandlers();

const PORT = process.env.LINK_SERVICE_PORT || 3005;

// Initialize database and start server
async function start() {
  try {
    getJwtSecret(); // fail fast in production when JWT_SECRET is missing
    await initDatabase();

    createApp().listen(PORT, () => {
      logger.info(`🚀 Link Service listening on port ${PORT}`);
    });
  } catch (error) {
    logger.fatal('Failed to start Link Service:', error);
    process.exit(1);
  }
}

start();

import dotenv from 'dotenv';
import { configureLogger, getJwtSecret, installProcessHandlers, logger } from 'shared';
import { createApp } from './app';
import { initDatabase } from './database';

dotenv.config();

configureLogger({ service: 'user-service' });
installProcessHandlers();

const PORT = process.env.USER_SERVICE_PORT || 3002;

// Initialize database and start server
async function start() {
  try {
    getJwtSecret(); // fail fast in production when JWT_SECRET is missing
    await initDatabase();

    createApp().listen(PORT, () => {
      logger.info(`🚀 User Service listening on port ${PORT}`);
    });
  } catch (error) {
    logger.fatal('Failed to start User Service:', error);
    process.exit(1);
  }
}

start();

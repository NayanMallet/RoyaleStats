import dotenv from 'dotenv';
import { configureLogger, installProcessHandlers, logger } from 'shared';
import { createApp } from './app';
import { initDatabase } from './database';
import { startWorker } from './worker';

dotenv.config();

configureLogger({ service: 'meta-tracker-service' });
installProcessHandlers();

const PORT = process.env.META_TRACKER_SERVICE_PORT || 3006;

// Initialize database and start server
async function start() {
  try {
    await initDatabase();

    createApp().listen(PORT, () => {
      logger.info(`🚀 Meta Tracker Service listening on port ${PORT}`);
      startWorker();
    });
  } catch (error) {
    logger.fatal('Failed to start Meta Tracker Service:', error);
    process.exit(1);
  }
}

start();

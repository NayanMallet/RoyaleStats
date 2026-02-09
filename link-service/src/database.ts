import Database from 'better-sqlite3';
import { logger } from 'shared';

let db: Database.Database | null = null;

export function initDatabase(): Database.Database {
  if (db) return db;

  const dbFile = process.env.LINK_DB_FILE || './database.sqlite';
  logger.info(`Initializing Link Service database at ${dbFile}`);

  db = new Database(dbFile);

  // Create player_links table
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      player_tag TEXT NOT NULL UNIQUE,
      twitter TEXT,
      twitch TEXT,
      linked_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_player_links_user_id ON player_links(user_id);
    CREATE INDEX IF NOT EXISTS idx_player_links_player_tag ON player_links(player_tag);
  `);

  // Migration: Add twitter and twitch columns if they don't exist
  try {
    const columns = db.pragma('table_info(player_links)') as any[];
    const hasTwitter = columns.some((col) => col.name === 'twitter');
    const hasTwitch = columns.some((col) => col.name === 'twitch');

    if (!hasTwitter) {
      logger.info('Migrating database: adding twitter column');
      db.exec('ALTER TABLE player_links ADD COLUMN twitter TEXT');
    }

    if (!hasTwitch) {
      logger.info('Migrating database: adding twitch column');
      db.exec('ALTER TABLE player_links ADD COLUMN twitch TEXT');
    }
  } catch (error) {
    logger.error('Error during database migration:', error);
  }

  logger.info('Link Service database initialized successfully');
  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

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
      linked_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_player_links_user_id ON player_links(user_id);
    CREATE INDEX IF NOT EXISTS idx_player_links_player_tag ON player_links(player_tag);
  `);

  logger.info('Link Service database initialized successfully');
  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

import Database from 'better-sqlite3';
import { logger } from 'shared';

let db: Database.Database | null = null;

export function initDatabase(): Database.Database {
  if (db) return db;

  const dbFile = process.env.META_DB_FILE || './database.sqlite';
  logger.info(`Initializing Meta Tracker Service database at ${dbFile}`);

  db = new Database(dbFile);

  // Create tables for battle tracking and card statistics
  db.exec(`
    CREATE TABLE IF NOT EXISTS battles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_tag TEXT,
      battle_time TEXT,
      deck_cards TEXT,
      opponent_deck TEXT,
      result TEXT,
      trophies INTEGER,
      ingested_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS card_stats (
      card_id INTEGER PRIMARY KEY,
      card_name TEXT UNIQUE NOT NULL,
      usage_count INTEGER DEFAULT 0,
      win_count INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_battles_player_tag ON battles(player_tag);
    CREATE INDEX IF NOT EXISTS idx_battles_result ON battles(result);
  `);

  // A battle is identified by its player and time. One-off migration, when the unique index does
  // not exist yet: remove the duplicates an older database may hold (keeping the first copy),
  // then let SQLite enforce the uniqueness.
  const hasUniqueIndex = db
    .prepare(
      "SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = 'idx_battles_player_time'",
    )
    .get();
  if (!hasUniqueIndex) {
    const database = db;
    database.transaction(() => {
      const removed = database
        .prepare(
          `DELETE FROM battles WHERE id NOT IN (
             SELECT MIN(id) FROM battles GROUP BY player_tag, battle_time
           )`,
        )
        .run().changes;
      if (removed > 0) {
        logger.warn('Duplicate battles removed before adding the unique index', { removed });
      }
      database.exec(
        'CREATE UNIQUE INDEX idx_battles_player_time ON battles(player_tag, battle_time)',
      );
    })();
    logger.info('Unique index on battles (player_tag, battle_time) created');
  }

  logger.info('Meta Tracker Service database initialized successfully');
  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

import Database from 'better-sqlite3'
import { logger } from 'shared'

let db: Database.Database | null = null

export function initDatabase(): Database.Database {
  if (db) return db

  const dbFile = process.env.META_DB_FILE || './database.sqlite'
  logger.info(`Initializing Meta Tracker Service database at ${dbFile}`)

  db = new Database(dbFile)

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
  `)

  logger.info('Meta Tracker Service database initialized successfully')
  return db
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

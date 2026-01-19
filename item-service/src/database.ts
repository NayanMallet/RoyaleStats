import Database from 'better-sqlite3'
import { logger } from 'shared'

let db: Database.Database | null = null

export function initDatabase(): Database.Database {
  if (db) return db

  const dbFile = process.env.ITEM_DB_FILE || './database.sqlite'
  logger.info(`Initializing Item Service database at ${dbFile}`)

  db = new Database(dbFile)

  // Create items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  logger.info('Item Service database initialized successfully')
  return db
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

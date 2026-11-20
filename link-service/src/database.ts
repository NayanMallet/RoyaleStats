import Database from 'better-sqlite3';
import { logger } from 'shared';

let db: Database.Database | null = null;

// Versioned migrations. The version reached is kept in the database itself (PRAGMA user_version):
// at start-up, each migration above it runs once, in its own transaction, so a failed migration
// leaves the database as it was. A migration is never edited once released: add a new one.
interface Migration {
  version: number;
  description: string;
  up: (db: Database.Database) => void;
}

function hasColumn(db: Database.Database, table: string, column: string): boolean {
  const columns = db.pragma(`table_info(${table})`) as { name: string }[];
  return columns.some((col) => col.name === column);
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'player_links with the social handles',
    up(db) {
      // Databases created before the versioning already have the table, sometimes without the
      // social columns: this migration brings them to the same state as a new one.
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
      for (const column of ['twitter', 'twitch']) {
        if (!hasColumn(db, 'player_links', column)) {
          db.exec(`ALTER TABLE player_links ADD COLUMN ${column} TEXT`);
        }
      }
    },
  },
  {
    version: 2,
    description: 'trophy goal, progression snapshot and achievements (RST-53)',
    up(db) {
      db.exec(`
        ALTER TABLE player_links ADD COLUMN trophy_goal INTEGER
          CHECK (trophy_goal IS NULL OR trophy_goal > 0);
        -- Profile seen at the previous evaluation of the achievements ("new arena").
        ALTER TABLE player_links ADD COLUMN snapshot_trophies INTEGER;
        ALTER TABLE player_links ADD COLUMN snapshot_arena_id INTEGER;
        ALTER TABLE player_links ADD COLUMN snapshot_at TEXT;

        CREATE TABLE achievements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          player_link_id INTEGER NOT NULL REFERENCES player_links(id) ON DELETE CASCADE,
          code TEXT NOT NULL,
          -- Goal value or arena name; '' rather than NULL so that UNIQUE applies.
          detail TEXT NOT NULL DEFAULT '',
          unlocked_at TEXT NOT NULL,
          UNIQUE (player_link_id, code, detail)
        );

        CREATE INDEX idx_achievements_player_link_id ON achievements(player_link_id);

        -- Existing data: every link already made unlocks "linked", dated from its linking.
        INSERT INTO achievements (player_link_id, code, unlocked_at)
        SELECT id, 'linked', strftime('%Y-%m-%dT%H:%M:%fZ', COALESCE(linked_at, CURRENT_TIMESTAMP))
        FROM player_links;
      `);
    },
  },
];

/** Brings the database to the last version. Returns the versions applied. */
export function migrate(database: Database.Database): number[] {
  const current = database.pragma('user_version', { simple: true }) as number;
  const applied: number[] = [];

  for (const migration of MIGRATIONS.filter((m) => m.version > current)) {
    database.transaction(() => {
      migration.up(database);
      database.pragma(`user_version = ${migration.version}`);
    })();
    logger.info(`Database migrated to version ${migration.version}: ${migration.description}`);
    applied.push(migration.version);
  }
  return applied;
}

export function initDatabase(): Database.Database {
  if (db) return db;

  const dbFile = process.env.LINK_DB_FILE || './database.sqlite';
  logger.info(`Initializing Link Service database at ${dbFile}`);

  db = new Database(dbFile);
  // Already on by default in better-sqlite3 (off in plain SQLite): stated here because the
  // achievements rely on it to follow the deletion of their link (ON DELETE CASCADE).
  db.pragma('foreign_keys = ON');
  migrate(db);

  logger.info('Link Service database initialized successfully');
  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

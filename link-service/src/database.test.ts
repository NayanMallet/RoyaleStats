import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';

process.env.LOG_LEVEL = 'fatal';

const { MIGRATIONS, migrate } = await import('./database');

const LAST_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

function openDatabase() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  return db;
}

const columnsOf = (db: Database.Database, table: string) =>
  (db.pragma(`table_info(${table})`) as { name: string }[]).map((column) => column.name);

describe('migrations', () => {
  it('brings a new database to the last version', () => {
    const db = openDatabase();

    expect(migrate(db)).toEqual(MIGRATIONS.map((migration) => migration.version));
    expect(db.pragma('user_version', { simple: true })).toBe(LAST_VERSION);
    expect(columnsOf(db, 'player_links')).toEqual(
      expect.arrayContaining(['twitter', 'twitch', 'trophy_goal', 'snapshot_trophies']),
    );
    expect(columnsOf(db, 'achievements')).toEqual([
      'id',
      'player_link_id',
      'code',
      'detail',
      'unlocked_at',
    ]);
  });

  it('runs each migration once', () => {
    const db = openDatabase();
    migrate(db);

    expect(migrate(db)).toEqual([]);
  });

  it('migrates a database created before the versioning, and keeps its data', () => {
    // Schema of the first releases: no social columns, no user_version.
    const db = openDatabase();
    db.exec(`
      CREATE TABLE player_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        player_tag TEXT NOT NULL UNIQUE,
        linked_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO player_links (user_id, player_tag, linked_at)
      VALUES (1, '#2PP8VJ9Q', '2026-10-01 18:30:00'), (2, '#8YLQ2C', '2026-10-02 09:00:00');
    `);

    migrate(db);

    expect(
      db.prepare('SELECT user_id, player_tag, twitter, trophy_goal FROM player_links').all(),
    ).toEqual([
      { user_id: 1, player_tag: '#2PP8VJ9Q', twitter: null, trophy_goal: null },
      { user_id: 2, player_tag: '#8YLQ2C', twitter: null, trophy_goal: null },
    ]);
    // Existing links unlock "linked", dated from their linking.
    expect(
      db.prepare('SELECT player_link_id, code, detail, unlocked_at FROM achievements').all(),
    ).toEqual([
      { player_link_id: 1, code: 'linked', detail: '', unlocked_at: '2026-10-01T18:30:00.000Z' },
      { player_link_id: 2, code: 'linked', detail: '', unlocked_at: '2026-10-02T09:00:00.000Z' },
    ]);
  });

  it('leaves the database untouched when a migration fails', () => {
    const db = openDatabase();
    migrate(db);
    db.pragma('user_version = 1');

    // Migration 2 adds columns that already exist now: it fails as a whole.
    expect(() => migrate(db)).toThrow();
    expect(db.pragma('user_version', { simple: true })).toBe(1);
  });

  describe('constraints', () => {
    function migratedWithLink() {
      const db = openDatabase();
      migrate(db);
      db.prepare("INSERT INTO player_links (user_id, player_tag) VALUES (1, '#P')").run();
      return db;
    }

    it('keeps an achievement once per link, code and detail', () => {
      const db = migratedWithLink();
      const insert = db.prepare(
        "INSERT OR IGNORE INTO achievements (player_link_id, code, detail, unlocked_at) VALUES (1, ?, ?, 'x')",
      );

      insert.run('goal-reached', '7000');
      insert.run('goal-reached', '7000');
      insert.run('goal-reached', '8000');

      expect(db.prepare('SELECT COUNT(*) AS n FROM achievements').get()).toEqual({ n: 2 });
    });

    it('deletes the achievements with their link', () => {
      const db = migratedWithLink();
      db.prepare(
        "INSERT INTO achievements (player_link_id, code, unlocked_at) VALUES (1, 'linked', 'x')",
      ).run();

      db.prepare('DELETE FROM player_links').run();

      expect(db.prepare('SELECT COUNT(*) AS n FROM achievements').get()).toEqual({ n: 0 });
    });

    it('refuses a goal that is not positive', () => {
      const db = migratedWithLink();

      expect(() => db.prepare('UPDATE player_links SET trophy_goal = 0').run()).toThrow(/CHECK/);
    });
  });
});

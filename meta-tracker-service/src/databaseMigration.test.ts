import { afterAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';

// A database created before the unique index, holding a duplicated battle.
const dir = mkdtempSync(join(tmpdir(), 'meta-migration-'));
const file = join(dir, 'database.sqlite');
const legacy = new Database(file);
legacy.exec(`
  CREATE TABLE battles (
    id INTEGER PRIMARY KEY AUTOINCREMENT, player_tag TEXT, battle_time TEXT, deck_cards TEXT,
    opponent_deck TEXT, result TEXT, trophies INTEGER, ingested_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  INSERT INTO battles (player_tag, battle_time, result) VALUES
    ('#A', 't1', 'win'), ('#A', 't1', 'win'), ('#A', 't2', 'loss');
`);
legacy.close();

process.env.META_DB_FILE = file;
process.env.LOG_LEVEL = 'fatal';
const { initDatabase } = await import('./database');

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('database migration', () => {
  it('removes the duplicated battles, then adds the unique index', () => {
    const db = initDatabase();

    expect(db.prepare('SELECT player_tag, battle_time FROM battles ORDER BY id').all()).toEqual([
      { player_tag: '#A', battle_time: 't1' },
      { player_tag: '#A', battle_time: 't2' },
    ]);
    expect(
      db.prepare("SELECT 1 AS ok FROM sqlite_master WHERE name = 'idx_battles_player_time'").get(),
    ).toEqual({ ok: 1 });
  });
});

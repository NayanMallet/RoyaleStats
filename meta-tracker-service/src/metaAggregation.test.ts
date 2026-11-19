import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

process.env.META_DB_FILE = ':memory:';
process.env.LOG_LEVEL = 'fatal';

const { initDatabase, getDatabase } = await import('./database');
const { processBattles } = await import('./services/ingestionService');
const { createApp } = await import('./app');

let server: Server;
let baseUrl: string;

const HOG_CYCLE = [
  'Hog Rider',
  'Musketeer',
  'Ice Golem',
  'Cannon',
  'Fireball',
  'The Log',
  'Ice Spirit',
  'Skeletons',
];
const LOG_BAIT = [
  'Goblin Barrel',
  'Princess',
  'Knight',
  'Inferno Tower',
  'Rocket',
  'The Log',
  'Ice Spirit',
  'Goblin Gang',
];

function battle(overrides: Record<string, unknown> = {}) {
  return {
    playerTag: '#2PP8VJ9Q',
    battleTime: '20261119T120000.000Z',
    deckCards: HOG_CYCLE,
    opponentDeck: LOG_BAIT,
    result: 'win',
    trophies: 6000,
    ...overrides,
  };
}

// Three controlled battles of one player: win and draw with Hog cycle, loss with Log bait.
const CONTROLLED = [
  battle({ battleTime: '20261119T120000.000Z', result: 'win' }),
  battle({
    battleTime: '20261119T121000.000Z',
    result: 'loss',
    deckCards: LOG_BAIT,
    opponentDeck: HOG_CYCLE,
  }),
  battle({ battleTime: '20261119T122000.000Z', result: 'draw' }),
];

function stats(card: string) {
  return getDatabase()
    .prepare('SELECT usage_count, win_count FROM card_stats WHERE card_name = ?')
    .get(card);
}

async function snapshot() {
  const response = await fetch(`${baseUrl}/snapshot`);
  return (await response.json()).snapshot;
}

beforeAll(async () => {
  initDatabase();
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server?.close();
});

beforeEach(() => {
  getDatabase().exec('DELETE FROM battles; DELETE FROM card_stats;');
});

describe('processBattles with controlled battles', () => {
  it('counts one usage per card per battle, and a win only for won battles', () => {
    expect(processBattles(CONTROLLED)).toEqual({ ingested: 3, duplicates: 0, invalid: 0 });

    // Hog cycle: played twice (win, draw), won once.
    expect(stats('Hog Rider')).toEqual({ usage_count: 2, win_count: 1 });
    // Log bait: played once, lost.
    expect(stats('Goblin Barrel')).toEqual({ usage_count: 1, win_count: 0 });
    // In both decks: played three times, won once.
    expect(stats('The Log')).toEqual({ usage_count: 3, win_count: 1 });
  });

  it('only counts the deck of the observed player, not the opponent deck', () => {
    processBattles([battle()]);

    expect(stats('Goblin Barrel')).toBeUndefined();
  });

  it('ignores battles already ingested: re-injecting the same observations changes nothing', () => {
    processBattles(CONTROLLED);
    const before = getDatabase().prepare('SELECT * FROM card_stats ORDER BY card_name').all();

    expect(processBattles(CONTROLLED)).toEqual({ ingested: 0, duplicates: 3, invalid: 0 });

    expect(getDatabase().prepare('SELECT * FROM card_stats ORDER BY card_name').all()).toEqual(
      before,
    );
    expect(getDatabase().prepare('SELECT COUNT(*) AS n FROM battles').get()).toEqual({ n: 3 });
  });

  it('counts the same battle seen by another player as another observation', () => {
    processBattles([battle()]);

    expect(
      processBattles([
        battle({
          playerTag: '#8YLQ2C',
          deckCards: LOG_BAIT,
          opponentDeck: HOG_CYCLE,
          result: 'loss',
        }),
      ]),
    ).toMatchObject({ ingested: 1 });
  });

  it('deduplicates inside one batch too', () => {
    expect(processBattles([battle(), battle()])).toMatchObject({ ingested: 1, duplicates: 1 });
    expect(stats('Hog Rider')).toEqual({ usage_count: 1, win_count: 1 });
  });
});

describe('invalid battles (found while verifying RST-26)', () => {
  it.each([
    ['an unknown result', { result: 'victory' }],
    ['no deck', { deckCards: undefined }],
    ['a deck that is not a list', { deckCards: 'Hog Rider,Musketeer' }],
    ['an empty deck', { deckCards: [] }],
    ['more than 8 cards', { deckCards: [...HOG_CYCLE, 'Valkyrie'] }],
    ['a card that is not a name', { deckCards: [...HOG_CYCLE.slice(0, 7), { id: 1 }] }],
    ['no player tag', { playerTag: undefined }],
    ['no battle time', { battleTime: '  ' }],
  ])('refuses a battle with %s and stores nothing', (_label, override) => {
    const report = processBattles([battle(override)]);

    expect(report).toEqual({ ingested: 0, duplicates: 0, invalid: 1 });
    expect(getDatabase().prepare('SELECT COUNT(*) AS n FROM battles').get()).toEqual({ n: 0 });
    expect(getDatabase().prepare('SELECT COUNT(*) AS n FROM card_stats').get()).toEqual({ n: 0 });
  });

  it('ignores null entries and keeps the valid battles of the same batch', () => {
    expect(processBattles([null, battle(), 'oops'])).toEqual({
      ingested: 1,
      duplicates: 0,
      invalid: 2,
    });
  });

  it('counts a card once per battle even when the deck lists it twice', () => {
    processBattles([battle({ deckCards: ['Hog Rider', 'Hog Rider', 'Musketeer'] })]);

    expect(stats('Hog Rider')).toEqual({ usage_count: 1, win_count: 1 });
  });
});

describe('POST /ingest/battles', () => {
  it('reports ingested, duplicate and invalid battles', async () => {
    const send = () =>
      fetch(`${baseUrl}/ingest/battles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ battles: [...CONTROLLED, { result: 'win' }] }),
      }).then((response) => response.json());

    expect(await send()).toEqual({ ingested: 3, duplicates: 0, invalid: 1 });
    expect(await send()).toEqual({ ingested: 0, duplicates: 3, invalid: 1 });
  });

  it('answers 400 when battles is not a list', async () => {
    const response = await fetch(`${baseUrl}/ingest/battles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ battles: 'nope' }),
    });

    expect(response.status).toBe(400);
  });
});

describe('GET /snapshot', () => {
  it('returns the total, the usage and the win rate of the most played cards', async () => {
    processBattles(CONTROLLED);

    const { totalBattles, topCards } = await snapshot();

    expect(totalBattles).toBe(3);
    expect(topCards).toHaveLength(10);
    expect(topCards[0]).toEqual({
      card_name: expect.any(String),
      usage_count: 3,
      win_count: 1,
      win_rate: 33.33,
    });
    expect(['The Log', 'Ice Spirit']).toContain(topCards[0].card_name);
    const hog = topCards.find((card: { card_name: string }) => card.card_name === 'Hog Rider');
    expect(hog).toEqual({ card_name: 'Hog Rider', usage_count: 2, win_count: 1, win_rate: 50 });
  });

  it('is empty before any battle', async () => {
    expect(await snapshot()).toMatchObject({ totalBattles: 0, topCards: [] });
  });
});

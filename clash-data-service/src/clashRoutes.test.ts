import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { NotFoundError, UpstreamError } from 'shared';

process.env.LOG_LEVEL = 'fatal';

// The Clash Royale API is replaced by a mock that records every call.
const fetchFromClashAPI = vi.fn();
vi.mock('./clashRoyaleClient', () => ({
  fetchFromClashAPI: (endpoint: string, options?: { notFound?: () => Error }) =>
    fetchFromClashAPI(endpoint, options),
}));

const { createApp } = await import('./app');
const { cache } = await import('./cache');

let server: Server;
let baseUrl: string;

async function get(path: string) {
  const response = await fetch(`${baseUrl}${path}`);
  return {
    status: response.status,
    cacheHeader: response.headers.get('x-cache'),
    body: await response.json(),
  };
}

beforeAll(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server?.close();
});

beforeEach(() => {
  cache.clear();
  fetchFromClashAPI.mockReset();
  fetchFromClashAPI.mockImplementation(async (endpoint: string) => ({ endpoint }));
});

describe('endpoints', () => {
  it.each([
    ['/players/%232pp8vj9q', '/players/%232PP8VJ9Q'],
    ['/players/2PP8VJ9Q/battles', '/players/%232PP8VJ9Q/battlelog'],
    ['/clans/%23qcq0pl', '/clans/%23QCQ0PL'],
    ['/cards', '/cards'],
    ['/leaderboards', '/leaderboards'],
    ['/leaderboard/170000005?limit=10', '/leaderboard/170000005?limit=10'],
    [
      '/locations/global/pathoflegend/players?limit=20',
      '/locations/global/pathoflegend/players?limit=20',
    ],
    ['/locations/global/pathoflegend/players', '/locations/global/pathoflegend/players'],
  ])('GET %s calls the Clash Royale API on %s', async (path, endpoint) => {
    const { status, body } = await get(path);

    expect(status).toBe(200);
    expect(body).toEqual({ endpoint });
  });

  it('honours the limit of the Path of Legend ranking and caches each limit apart', async () => {
    await get('/locations/global/pathoflegend/players?limit=3');
    await get('/locations/global/pathoflegend/players?limit=20');

    expect(fetchFromClashAPI).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['/leaderboard/abc', 'L’identifiant du classement doit être un nombre.'],
    [
      '/locations/global/pathoflegend/players?limit=ten',
      'Le paramètre limit doit être un nombre entier.',
    ],
  ])('answers 400 on %s', async (path, message) => {
    const { status, body } = await get(path);

    expect(status).toBe(400);
    expect(body.message).toBe(message);
    expect(fetchFromClashAPI).not.toHaveBeenCalled();
  });

  it('answers 404 PlayerNotFound for an unknown player', async () => {
    fetchFromClashAPI.mockImplementation(async (_endpoint, options) => {
      throw options.notFound();
    });

    const { status, body } = await get('/players/%23UNKNOWN');

    expect(status).toBe(404);
    expect(body.error).toBe('PlayerNotFound');
  });
});

describe('cache', () => {
  it('answers the second read from the cache without calling the API again', async () => {
    const first = await get('/players/%232PP8VJ9Q');
    const second = await get('/players/%232pp8vj9q');

    expect(first.cacheHeader).toBe('MISS');
    expect(second.cacheHeader).toBe('HIT');
    expect(second.body).toEqual(first.body);
    expect(fetchFromClashAPI).toHaveBeenCalledTimes(1);
  });

  it('shares one API call between identical requests arriving together', async () => {
    let release: (value: unknown) => void = () => {};
    fetchFromClashAPI.mockImplementation(() => new Promise((resolve) => (release = resolve)));

    const pending = Promise.all([get('/cards'), get('/cards'), get('/cards')]);
    await vi.waitFor(() => expect(fetchFromClashAPI).toHaveBeenCalled());
    release({ items: [] });
    const answers = await pending;

    expect(fetchFromClashAPI).toHaveBeenCalledTimes(1);
    expect(answers.map((answer) => answer.body)).toEqual([
      { items: [] },
      { items: [] },
      { items: [] },
    ]);
  });

  it('never caches an error: the next read calls the API again', async () => {
    fetchFromClashAPI.mockRejectedValueOnce(new UpstreamError(503));
    expect((await get('/cards')).status).toBe(503);

    const retry = await get('/cards');

    expect(retry.status).toBe(200);
    expect(retry.cacheHeader).toBe('MISS');
    expect(fetchFromClashAPI).toHaveBeenCalledTimes(2);
  });

  it('does not cache an unknown player either', async () => {
    fetchFromClashAPI.mockRejectedValue(new NotFoundError('x', { code: 'PlayerNotFound' }));

    await get('/players/%23UNKNOWN');
    await get('/players/%23UNKNOWN');

    expect(fetchFromClashAPI).toHaveBeenCalledTimes(2);
  });
});

describe('GET /players/:playerTag/summary', () => {
  const win = (minute: number) => ({
    battleTime: `20261119T12${String(minute).padStart(2, '0')}00.000Z`,
    team: [{ tag: '#2PP8VJ9Q', crowns: 3, trophyChange: 30 }],
    opponent: [{ tag: '#X', crowns: 0 }],
  });

  /** Profile and battle log answered by the mocked API. */
  function apiAnswers(log: unknown[]) {
    fetchFromClashAPI.mockImplementation(async (endpoint: string) =>
      endpoint.endsWith('/battlelog') ? log : { tag: '#2PP8VJ9Q' },
    );
  }

  it('summarizes the battle log of the player', async () => {
    apiAnswers([win(4), win(3), win(2), win(1), win(0)]);

    const { status, body } = await get('/players/%232pp8vj9q/summary');

    expect(status).toBe(200);
    expect(fetchFromClashAPI).toHaveBeenCalledWith(
      '/players/%232PP8VJ9Q/battlelog',
      expect.anything(),
    );
    expect(body).toMatchObject({
      playerTag: '#2PP8VJ9Q',
      sampleSize: 5,
      insufficientData: false,
      wins: 5,
      winRate: 100,
      streak: { result: 'win', count: 5 },
      trophyChange: { total: 150, battles: 5 },
    });
  });

  it('answers an empty log with insufficientData, not with an error or a 0 %', async () => {
    apiAnswers([]);

    const { status, body } = await get('/players/%232PP8VJ9Q/summary');

    expect(status).toBe(200);
    expect(body).toMatchObject({ sampleSize: 0, insufficientData: true, winRate: null });
  });

  it('keeps an unavailable Clash Royale API distinct from an empty sample', async () => {
    fetchFromClashAPI.mockRejectedValue(new UpstreamError(503));

    const { status, body } = await get('/players/%232PP8VJ9Q/summary');

    expect(status).toBe(503);
    expect(body).not.toHaveProperty('winRate');
  });

  it('answers 404 PlayerNotFound for an unknown player, whose battle log the API answers empty', async () => {
    fetchFromClashAPI.mockImplementation(async (endpoint: string, options) => {
      if (endpoint.endsWith('/battlelog')) return [];
      throw options.notFound();
    });

    const { status, body } = await get('/players/%23UNKNOWN/summary');

    expect(status).toBe(404);
    expect(body.error).toBe('PlayerNotFound');
  });

  it('shares the caches of the profile and of the battle log', async () => {
    apiAnswers([win(0)]);

    await get('/players/%232PP8VJ9Q');
    const battles = await get('/players/%232PP8VJ9Q/battles');
    const summary = await get('/players/%232PP8VJ9Q/summary');

    expect(battles.cacheHeader).toBe('MISS');
    expect(summary.cacheHeader).toBe('HIT');
    expect(fetchFromClashAPI).toHaveBeenCalledTimes(2);
  });
});

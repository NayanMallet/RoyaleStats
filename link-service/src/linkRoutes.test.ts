import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import jwt from 'jsonwebtoken';

// The Clash Data Service is mocked: every tag exists, except #UNKNOWN.
// The Clash Data Service is mocked: every tag exists, except #UNKNOWN; #SLOW never answers in time.
vi.mock('node-fetch', () => ({
  default: vi.fn(async (url: string) => {
    if (url.includes('SLOW')) {
      throw Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' });
    }
    return { ok: !url.includes('UNKNOWN'), status: url.includes('UNKNOWN') ? 404 : 200 };
  }),
}));

process.env.LINK_DB_FILE = ':memory:';
process.env.JWT_SECRET = 'test-secret';
process.env.LOG_LEVEL = 'fatal';

const { initDatabase, getDatabase } = await import('./database');
const { createApp } = await import('./app');

let server: Server;
let baseUrl: string;

const tokenFor = (userId: number) =>
  jwt.sign({ userId, email: `user${userId}@example.com` }, 'test-secret', { expiresIn: '1h' });

async function call(
  method: string,
  path: string,
  options: { userId?: number; token?: string; body?: unknown } = {},
) {
  const token = options.token ?? (options.userId ? tokenFor(options.userId) : undefined);
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : undefined };
}

beforeAll(async () => {
  initDatabase();
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  getDatabase().exec('DELETE FROM player_links');
});

describe('private routes', () => {
  it.each([
    ['POST', '/link'],
    ['GET', '/link/1'],
    ['PATCH', '/link/1'],
    ['DELETE', '/link/1'],
  ])('%s %s answers 401 without a token', async (method, path) => {
    const { status, body } = await call(method, path, { body: method === 'POST' ? {} : undefined });

    expect(status).toBe(401);
    expect(body.error).toBe('AuthenticationError');
  });

  it('answers 401 with a token signed by someone else', async () => {
    const forged = jwt.sign({ userId: 1, email: 'a@example.com' }, 'not-the-secret');

    const { status } = await call('GET', '/link/1', { token: forged });

    expect(status).toBe(401);
  });
});

describe('create a link', () => {
  it('links the player to the account of the token', async () => {
    const { status, body } = await call('POST', '/link', {
      userId: 1,
      body: { playerTag: '#2pp8vj9q' },
    });

    expect(status).toBe(201);
    expect(body).toMatchObject({ user_id: 1, player_tag: '#2PP8VJ9Q' });
  });

  it('refuses to create a link for another account', async () => {
    const { status, body } = await call('POST', '/link', {
      userId: 1,
      body: { userId: 2, playerTag: '#2PP8VJ9Q' },
    });

    expect(status).toBe(403);
    expect(body.error).toBe('Forbidden');
    expect(getDatabase().prepare('SELECT COUNT(*) AS n FROM player_links').get()).toEqual({ n: 0 });
  });

  it('answers 404 PlayerNotFound for a tag unknown to Clash Royale', async () => {
    const { status, body } = await call('POST', '/link', {
      userId: 1,
      body: { playerTag: '#UNKNOWN' },
    });

    expect(status).toBe(404);
    expect(body.error).toBe('PlayerNotFound');
  });

  it('answers 504 when the Clash Data Service does not answer in time', async () => {
    const { status, body } = await call('POST', '/link', {
      userId: 1,
      body: { playerTag: '#SLOW' },
    });

    expect(status).toBe(504);
    expect(body.error).toBe('GatewayTimeout');
  });

  it('answers 409 when the tag is already linked to another account', async () => {
    await call('POST', '/link', { userId: 1, body: { playerTag: '#2PP8VJ9Q' } });

    const { status, body } = await call('POST', '/link', {
      userId: 2,
      body: { playerTag: '#2PP8VJ9Q' },
    });

    expect(status).toBe(409);
    expect(body.error).toBe('ConflictError');
  });
});

describe('read, update and delete a link', () => {
  beforeEach(async () => {
    await call('POST', '/link', { userId: 1, body: { playerTag: '#2PP8VJ9Q' } });
  });

  it('lets the owner read, update and delete their link', async () => {
    expect((await call('GET', '/link/1', { userId: 1 })).status).toBe(200);

    const updated = await call('PATCH', '/link/1', {
      userId: 1,
      body: { twitter: '@karim_cr', twitch: 'karimcr' },
    });
    expect(updated.body).toMatchObject({ twitter: 'karim_cr', twitch: 'karimcr' });

    expect((await call('DELETE', '/link/1', { userId: 1 })).status).toBe(204);
  });

  it.each([
    ['GET', undefined],
    ['PATCH', { twitter: 'hacked' }],
    ['DELETE', undefined],
  ])('forbids user B to %s the link of user A', async (method, body) => {
    const { status } = await call(method, '/link/1', { userId: 2, body });

    expect(status).toBe(403);
    const link = getDatabase().prepare('SELECT * FROM player_links WHERE user_id = 1').get() as {
      twitter: string | null;
    };
    expect(link.twitter).toBeNull();
  });

  it('rejects an invalid social handle', async () => {
    const { status, body } = await call('PATCH', '/link/1', {
      userId: 1,
      body: { twitter: '<script>' },
    });

    expect(status).toBe(400);
    expect(body.details).toEqual({ twitter: 'Format invalide' });
  });
});

describe('public search by tag', () => {
  it('only exposes the public fields, without any account id', async () => {
    await call('POST', '/link', { userId: 1, body: { playerTag: '#2PP8VJ9Q' } });

    const { status, body } = await call('GET', '/link/tag/%232PP8VJ9Q');

    expect(status).toBe(200);
    expect(Object.keys(body).sort()).toEqual(['linked_at', 'player_tag', 'twitch', 'twitter']);
  });
});

describe('tag normalisation and player_links constraints (RST-17)', () => {
  const storedTags = () =>
    (
      getDatabase().prepare('SELECT player_tag FROM player_links').all() as { player_tag: string }[]
    ).map((row) => row.player_tag);

  it.each([' #2pp8vj9q ', '2pp8vj9q', '##2PP8VJ9Q', '#2Pp8Vj9q'])(
    'stores %j as #2PP8VJ9Q',
    async (playerTag) => {
      const { status, body } = await call('POST', '/link', { userId: 1, body: { playerTag } });

      expect(status).toBe(201);
      expect(body.player_tag).toBe('#2PP8VJ9Q');
      expect(storedTags()).toEqual(['#2PP8VJ9Q']);
    },
  );

  it.each([['#'], ['  '], ['ab'], ['#2PP 8VJ'], ['#2PP-8VJ'], ['#' + 'A'.repeat(16)], [42]])(
    'refuses the tag %j with 400 InvalidPlayerTag and stores nothing',
    async (playerTag) => {
      const { status, body } = await call('POST', '/link', { userId: 1, body: { playerTag } });

      expect(status).toBe(400);
      expect(body.error).toBe('InvalidPlayerTag');
      expect(storedTags()).toEqual([]);
    },
  );

  it('answers 400 without tag', async () => {
    const { status, body } = await call('POST', '/link', { userId: 1, body: {} });

    expect(status).toBe(400);
    expect(body.details).toEqual({ playerTag: 'Champ obligatoire' });
  });

  it('allows one link per account (user_id UNIQUE)', async () => {
    await call('POST', '/link', { userId: 1, body: { playerTag: '#2PP8VJ9Q' } });

    const { status, body } = await call('POST', '/link', {
      userId: 1,
      body: { playerTag: '#8YLQ2C' },
    });

    expect(status).toBe(409);
    expect(body.message).toBe('Ce compte est déjà associé à un joueur.');
  });

  it('allows one account per tag (player_tag UNIQUE), whatever its case or #', async () => {
    await call('POST', '/link', { userId: 1, body: { playerTag: '#2PP8VJ9Q' } });

    const { status, body } = await call('POST', '/link', {
      userId: 2,
      body: { playerTag: ' 2pp8vj9q' },
    });

    expect(status).toBe(409);
    expect(body.message).toBe('Ce tag est déjà associé à un autre compte.');
  });

  it('keeps one link when two accounts link the same tag at the same time', async () => {
    const answers = await Promise.all([
      call('POST', '/link', { userId: 1, body: { playerTag: '#2PP8VJ9Q' } }),
      call('POST', '/link', { userId: 2, body: { playerTag: '#2PP8VJ9Q' } }),
    ]);

    expect(answers.map((answer) => answer.status).sort()).toEqual([201, 409]);
    expect(storedTags()).toEqual(['#2PP8VJ9Q']);
  });

  it('frees the tag once its link is deleted', async () => {
    await call('POST', '/link', { userId: 1, body: { playerTag: '#2PP8VJ9Q' } });
    expect((await call('DELETE', '/link/1', { userId: 1 })).status).toBe(204);

    expect((await call('DELETE', '/link/1', { userId: 1 })).status).toBe(404);
    expect((await call('GET', '/link/1', { userId: 1 })).status).toBe(404);
    expect((await call('GET', '/link/tag/2PP8VJ9Q')).status).toBe(404);

    const relinked = await call('POST', '/link', { userId: 2, body: { playerTag: '#2PP8VJ9Q' } });
    expect(relinked.status).toBe(201);
  });

  it('finds a link by tag with or without # and whatever the case', async () => {
    await call('POST', '/link', { userId: 1, body: { playerTag: '#2PP8VJ9Q' } });

    for (const tag of ['%232PP8VJ9Q', '2pp8vj9q', '%23%232pp8vj9q']) {
      const { status, body } = await call('GET', `/link/tag/${tag}`);
      expect(status).toBe(200);
      expect(body.player_tag).toBe('#2PP8VJ9Q');
    }
  });

  it('answers 400 when searching an invalid tag', async () => {
    const { status, body } = await call('GET', '/link/tag/a%20b');

    expect(status).toBe(400);
    expect(body.error).toBe('InvalidPlayerTag');
  });
});

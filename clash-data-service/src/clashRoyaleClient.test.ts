import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError } from 'shared';

// node-fetch is mocked per test; the client reads CLASH_API_TIMEOUT_MS when it is imported.
const fetchMock = vi.fn();
vi.mock('node-fetch', () => ({ default: (...args: unknown[]) => fetchMock(...args) }));
process.env.CLASH_API_TIMEOUT_MS = '30';
process.env.LOG_LEVEL = 'fatal';

const { errorForClashFailure, errorForClashStatus, fetchFromClashAPI } = await import(
  './clashRoyaleClient'
);

afterEach(() => fetchMock.mockReset());

describe('errorForClashStatus', () => {
  it('answers 503 ClashApiMisconfigured instead of 500 when the API key is refused (403)', () => {
    const error = errorForClashStatus(403);

    expect(error.statusCode).toBe(503);
    expect(error.code).toBe('ClashApiMisconfigured');
    expect(error.message).not.toMatch(/key|clé|IP/i);
  });

  it.each([
    [400, 400, 'ValidationError'],
    [404, 404, 'NotFound'],
    [429, 429, 'RateLimited'],
    [503, 503, 'ServiceUnavailable'],
    [500, 502, 'ClashApiUnavailable'],
  ])('maps a Clash Royale %i to %i %s', (clashStatus, statusCode, code) => {
    const error = errorForClashStatus(clashStatus);

    expect(error.statusCode).toBe(statusCode);
    expect(error.code).toBe(code);
    expect(error.internalDetails).toMatchObject({ clashStatus });
  });

  it('uses the not found error of the caller, e.g. PlayerNotFound', () => {
    const error = errorForClashStatus(404, {
      notFound: () => new NotFoundError('Aucun joueur.', { code: 'PlayerNotFound' }),
    });

    expect(error.code).toBe('PlayerNotFound');
  });
});

describe('errorForClashFailure', () => {
  it('answers 504 ClashApiTimeout when the API is too slow', () => {
    const error = errorForClashFailure(
      Object.assign(new Error('aborted'), { type: 'aborted' }),
      '/cards',
    );

    expect(error).toMatchObject({ statusCode: 504, code: 'ClashApiTimeout' });
  });

  it('answers 503 ClashApiUnavailable when the API cannot be reached', () => {
    const error = errorForClashFailure(
      Object.assign(new Error('getaddrinfo ENOTFOUND api.clashroyale.com'), { code: 'ENOTFOUND' }),
      '/cards',
    );

    expect(error).toMatchObject({ statusCode: 503, code: 'ClashApiUnavailable' });
    expect(error.message).not.toContain('ENOTFOUND');
  });
});

describe('fetchFromClashAPI', () => {
  it('gives up after CLASH_API_TIMEOUT_MS with a 504', async () => {
    // Never answers, until the time limit aborts the request.
    fetchMock.mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () =>
            reject(Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' })),
          );
        }),
    );

    const started = Date.now();
    const error = await fetchFromClashAPI('/cards').catch((e: unknown) => e);

    expect(error).toMatchObject({ statusCode: 504, code: 'ClashApiTimeout' });
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('returns the JSON body on success', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ items: [] }) });

    await expect(fetchFromClashAPI('/cards')).resolves.toEqual({ items: [] });
  });
});

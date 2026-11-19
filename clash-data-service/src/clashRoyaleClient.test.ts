import { describe, expect, it } from 'vitest';
import { NotFoundError } from 'shared';
import { errorForClashStatus } from './clashRoyaleClient';

describe('errorForClashStatus', () => {
  it('answers 503 instead of 500 when the API key is refused (403)', () => {
    const error = errorForClashStatus(403);

    expect(error.statusCode).toBe(503);
    expect(error.code).toBe('ClashApiUnavailable');
    expect(error.message).not.toMatch(/key|IP/i);
  });

  it.each([
    [400, 400, 'ValidationError'],
    [404, 404, 'NotFound'],
    [429, 429, 'RateLimited'],
    [503, 503, 'ServiceUnavailable'],
    [500, 502, 'BadGateway'],
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

import { describe, expect, it } from 'vitest';
import { upstreamErrorFor } from './proxy';

function networkError(code: string) {
  return Object.assign(new Error(`connect ${code} 172.18.0.4:3002`), { code });
}

describe('upstreamErrorFor', () => {
  it.each([
    ['ECONNREFUSED', 503, 'ServiceUnavailable'],
    ['ENOTFOUND', 503, 'ServiceUnavailable'],
    ['ETIMEDOUT', 504, 'GatewayTimeout'],
    ['ECONNRESET', 504, 'GatewayTimeout'],
    ['EPROTO', 502, 'BadGateway'],
  ])('maps %s to %i %s', (code, statusCode, errorCode) => {
    const error = upstreamErrorFor('User Service', networkError(code));

    expect(error.statusCode).toBe(statusCode);
    expect(error.code).toBe(errorCode);
    expect(error.internalDetails).toEqual({ service: 'User Service', code });
  });

  it('never puts the internal address in the message', () => {
    const error = upstreamErrorFor('User Service', networkError('ECONNREFUSED'));

    expect(error.message).not.toContain('172.18');
  });
});

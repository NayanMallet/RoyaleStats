import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { TIMEOUTS_MS, isTimeoutError, timeoutFromEnv } from './timeouts';

afterEach(() => vi.unstubAllEnvs());

describe('timeouts', () => {
  it('keeps each hop shorter than the one above it', () => {
    expect(TIMEOUTS_MS.externalApi).toBeLessThan(TIMEOUTS_MS.serviceCall);
    expect(TIMEOUTS_MS.serviceCall).toBeLessThan(TIMEOUTS_MS.gatewayProxy);
  });

  it('reads a valid value from the environment, and falls back otherwise', () => {
    vi.stubEnv('TEST_TIMEOUT_MS', '2500');
    expect(timeoutFromEnv('TEST_TIMEOUT_MS', 8000)).toBe(2500);

    vi.stubEnv('TEST_TIMEOUT_MS', 'abc');
    expect(timeoutFromEnv('TEST_TIMEOUT_MS', 8000)).toBe(8000);
    expect(timeoutFromEnv('UNSET_TIMEOUT_MS', 8000)).toBe(8000);
  });

  it('recognises the abort errors of native fetch and node-fetch', async () => {
    // A server that accepts the request and never answers.
    const server = createServer(() => {}).listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address() as AddressInfo;
    const native = await fetch(`http://127.0.0.1:${port}`, {
      signal: AbortSignal.timeout(20),
    }).catch((error: unknown) => error);
    server.closeAllConnections();
    server.close();

    expect(isTimeoutError(native)).toBe(true);
    expect(isTimeoutError(Object.assign(new Error('aborted'), { type: 'aborted' }))).toBe(true);
    expect(isTimeoutError(new TypeError('fetch failed'))).toBe(false);
  });
});

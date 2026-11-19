import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureLogger, logger, requestContext } from './logger';

function lastLine(stream: NodeJS.WriteStream): string {
  const calls = vi.mocked(stream.write).mock.calls;
  return String(calls.at(-1)?.[0] ?? '');
}

beforeEach(() => {
  vi.spyOn(process.stdout, 'write').mockReturnValue(true);
  vi.spyOn(process.stderr, 'write').mockReturnValue(true);
  configureLogger({ service: 'test-service' });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('logger in production', () => {
  beforeEach(() => vi.stubEnv('NODE_ENV', 'production'));

  it('writes one JSON line with the service and the requestId of the current request', () => {
    requestContext.run({ requestId: 'req-12345678' }, () => logger.info('Player fetched'));

    expect(JSON.parse(lastLine(process.stdout))).toMatchObject({
      level: 'info',
      service: 'test-service',
      requestId: 'req-12345678',
      msg: 'Player fetched',
    });
  });

  it('writes errors to stderr with their stack', () => {
    logger.error('Request failed', new Error('Boom'));

    const entry = JSON.parse(lastLine(process.stderr));
    expect(entry.err).toMatchObject({ type: 'Error', message: 'Boom' });
    expect(entry.err.stack).toContain('Error: Boom');
  });

  it('skips debug logs unless LOG_LEVEL asks for them', () => {
    logger.debug('Cache hit');
    expect(process.stdout.write).not.toHaveBeenCalled();

    vi.stubEnv('LOG_LEVEL', 'debug');
    logger.debug('Cache hit');
    expect(JSON.parse(lastLine(process.stdout)).level).toBe('debug');
  });
});

describe('logger in development', () => {
  beforeEach(() => vi.stubEnv('NODE_ENV', 'development'));

  it('writes a readable line instead of JSON', () => {
    logger.warn('Slow answer from %s', 'clash-data-service');

    const line = lastLine(process.stdout);
    expect(line).toMatch(/^\[WARN\] .* \[test-service\] Slow answer from clash-data-service/);
  });
});

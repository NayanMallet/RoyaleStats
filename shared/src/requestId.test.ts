import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { requestContext } from './logger';
import { REQUEST_ID_HEADER, requestIdMiddleware } from './requestId';

function run(incoming?: string) {
  const req = { get: vi.fn().mockReturnValue(incoming) } as unknown as Request;
  const res = { locals: {}, setHeader: vi.fn() } as unknown as Response;
  let contextId: string | undefined;

  requestIdMiddleware()(req, res, () => {
    contextId = requestContext.getStore()?.requestId;
  });

  return { res, contextId };
}

afterEach(() => vi.restoreAllMocks());

describe('requestIdMiddleware', () => {
  it('creates a UUID when the request has none, and exposes it everywhere', () => {
    const { res, contextId } = run();

    expect(res.locals.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, res.locals.requestId);
    expect(contextId).toBe(res.locals.requestId);
  });

  it('keeps the id forwarded by the API Gateway', () => {
    const { res } = run('6f1c9e2a-0000-4000-8000-000000000000');

    expect(res.locals.requestId).toBe('6f1c9e2a-0000-4000-8000-000000000000');
  });

  it('replaces an id that could inject text into the logs', () => {
    const { res } = run('abc\n{"level":"fatal"}');

    expect(res.locals.requestId).not.toContain('fatal');
  });
});

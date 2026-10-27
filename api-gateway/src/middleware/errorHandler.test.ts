import { describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { errorHandler } from './errorHandler';

function mockResponse() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

const req = { method: 'GET', path: '/api/test' } as Request;
const next = vi.fn() as NextFunction;

describe('errorHandler', () => {
  it('responds 500 with the error contract when no status code is set', () => {
    const res = mockResponse();

    errorHandler(new Error('Boom'), req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Error',
      message: 'Boom',
      statusCode: 500,
    });
  });

  it('keeps the status code carried by the error', () => {
    const res = mockResponse();
    const error = Object.assign(new Error('Player not found'), {
      name: 'PlayerNotFound',
      statusCode: 404,
    });

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'PlayerNotFound', statusCode: 404 }),
    );
  });
});

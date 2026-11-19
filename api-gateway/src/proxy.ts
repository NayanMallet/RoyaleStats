import type { Request, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { REQUEST_ID_HEADER, UpstreamError, getRequestId, logger, toApiError } from 'shared';

// Service URLs (use env vars for local dev or defaults for Docker)
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3002';
const ITEM_SERVICE_URL = process.env.ITEM_SERVICE_URL || 'http://item-service:3003';
const CLASH_DATA_SERVICE_URL =
  process.env.CLASH_DATA_SERVICE_URL || 'http://clash-data-service:3004';
const LINK_SERVICE_URL = process.env.LINK_SERVICE_URL || 'http://link-service:3005';
const META_TRACKER_SERVICE_URL =
  process.env.META_TRACKER_SERVICE_URL || 'http://meta-tracker-service:3006';
const PUBLIC_API_URL = process.env.PUBLIC_API_URL || 'http://public-api:3001';

// Network errors meaning the service is down or not resolvable yet (container restarting).
const UNAVAILABLE_CODES = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'EHOSTUNREACH']);
const TIMEOUT_CODES = new Set(['ETIMEDOUT', 'ESOCKETTIMEDOUT', 'ECONNRESET']);

/** A failed proxy call → 503 (service down), 504 (no answer in time) or 502 (anything else). */
export function upstreamErrorFor(serviceName: string, error: unknown): UpstreamError {
  const code = (error as { code?: unknown })?.code;
  const internalDetails = { service: serviceName, code };
  if (typeof code === 'string' && UNAVAILABLE_CODES.has(code)) {
    return new UpstreamError(503, undefined, { internalDetails, cause: error });
  }
  if (typeof code === 'string' && TIMEOUT_CODES.has(code)) {
    return new UpstreamError(504, undefined, { internalDetails, cause: error });
  }
  return new UpstreamError(502, undefined, { internalDetails, cause: error });
}

// Helper function to create proxy with logging and error handling.
// `internal` services receive the x-request-id, so that their logs share the Gateway's id.
function createServiceProxy(
  serviceName: string,
  target: string,
  pathRewrite?: Record<string, string>,
  extraOptions: any = {},
  internal = true,
) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite,
    logger,
    timeout: 30000,
    proxyTimeout: 30000,
    ...extraOptions,
    on: {
      // http-proxy-middleware logs each proxied call itself, through the shared logger.
      proxyReq: (proxyReq: any, _req: any, res: Response) => {
        if (internal) proxyReq.setHeader(REQUEST_ID_HEADER, getRequestId(res));
        // Apply custom headers if provided
        if (extraOptions.headers) {
          Object.entries(extraOptions.headers).forEach(([key, value]) => {
            proxyReq.setHeader(key, value as string);
          });
        }
      },
      error: (err: Error, req: Request, res: Response) => {
        const upstreamError = upstreamErrorFor(serviceName, err);
        logger.error(`[PROXY ERROR] ${serviceName} on ${req.method} ${req.originalUrl}`, err, {
          requestId: getRequestId(res),
          statusCode: upstreamError.statusCode,
        });
        if (res && !res.headersSent) {
          res
            .status(upstreamError.statusCode)
            .json(toApiError(upstreamError, getRequestId(res), upstreamError));
        }
      },
    },
  });
}

export const proxies = {
  users: createServiceProxy('User Service', USER_SERVICE_URL, { '^/': '/users/' }),
  items: createServiceProxy('Item Service', ITEM_SERVICE_URL, { '^/': '/items/' }),
  clash: createServiceProxy('Clash Data Service', CLASH_DATA_SERVICE_URL),
  link: createServiceProxy('Link Service', LINK_SERVICE_URL, { '^/': '/link/' }),
  meta: createServiceProxy('Meta Tracker Service', META_TRACKER_SERVICE_URL),
  public: createServiceProxy('Public API', PUBLIC_API_URL),
  // External proxy for scraping/data
  royaleapi: createServiceProxy(
    'RoyaleAPI Proxy',
    'https://royaleapi.com',
    { '^/api/royaleapi': '' },
    {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://royaleapi.com/',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    },
    false,
  ),
};

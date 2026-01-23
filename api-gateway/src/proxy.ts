import { createProxyMiddleware } from 'http-proxy-middleware';
import { logger } from 'shared';

// Service URLs (use env vars for local dev or defaults for Docker)
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3002';
const ITEM_SERVICE_URL = process.env.ITEM_SERVICE_URL || 'http://item-service:3003';
const CLASH_DATA_SERVICE_URL =
  process.env.CLASH_DATA_SERVICE_URL || 'http://clash-data-service:3004';
const LINK_SERVICE_URL = process.env.LINK_SERVICE_URL || 'http://link-service:3005';
const META_TRACKER_SERVICE_URL =
  process.env.META_TRACKER_SERVICE_URL || 'http://meta-tracker-service:3006';
const PUBLIC_API_URL = process.env.PUBLIC_API_URL || 'http://public-api:3001';

// Helper function to create proxy with logging and error handling
function createServiceProxy(
  serviceName: string,
  target: string,
  pathRewrite?: Record<string, string>,
  extraOptions: any = {},
) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite,
    logger: console,
    ...extraOptions,
    on: {
      proxyReq: (proxyReq: any, req: any) => {
        logger.info(`[PROXY] ${req.method} ${req.url} -> ${target}`);
        // Apply custom headers if provided
        if (extraOptions.headers) {
          Object.entries(extraOptions.headers).forEach(([key, value]) => {
            proxyReq.setHeader(key, value as string);
          });
        }
      },
      error: (err: any, req: any, res: any) => {
        logger.error(`[PROXY ERROR] ${serviceName}:`, err);
        if (res && !res.headersSent) {
          res.status(502).json({ error: 'BadGateway', message: `${serviceName} unavailable` });
        }
      },
    },
  });
}

export const proxies = {
  users: createServiceProxy('User Service', USER_SERVICE_URL, { '^/api/users': '/users' }),
  items: createServiceProxy('Item Service', ITEM_SERVICE_URL, { '^/api/items': '/items' }),
  clash: createServiceProxy('Clash Data Service', CLASH_DATA_SERVICE_URL, { '^/api/clash': '' }),
  link: createServiceProxy('Link Service', LINK_SERVICE_URL, { '^/api/link': '/link' }),
  meta: createServiceProxy('Meta Tracker Service', META_TRACKER_SERVICE_URL, { '^/api/meta': '' }),
  public: createServiceProxy('Public API', PUBLIC_API_URL, { '^/api/public': '' }),
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
  ),
};

import { RequestHandler } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

// TODO: Move service URLs to environment variables or config files
const USER_SERVICE = 'http://user-service:3002';

const proxy: RequestHandler = createProxyMiddleware({
  changeOrigin: true,
  pathRewrite: { '^/api': '' },
  // Route based on the path: /api/users -> user-service
  router: (req) => {
    const url = req.url || '';
    if (url.startsWith('/users')) return USER_SERVICE;

    return USER_SERVICE; // default fallback
  },
});

export default proxy;

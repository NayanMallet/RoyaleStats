import cors from 'cors';

export function createCorsMiddleware() {
  const isDev = process.env.NODE_ENV !== 'production';

  // In development, allow all localhost origins
  if (isDev) {
    return cors({
      origin: true, // Allow all origins in dev
      credentials: true,
      optionsSuccessStatus: 204,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });
  }

  // In production, use configured origins
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
    optionsSuccessStatus: 204,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
}

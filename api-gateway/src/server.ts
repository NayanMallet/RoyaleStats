import 'dotenv/config';
import express, { Application, Request, Response, NextFunction } from 'express';
import { createCorsMiddleware } from 'shared';
import setupRoutes from './routes';

const app: Application = express();
const PORT: number = Number(process.env.GATEWAY_PORT) || 3000;

// TODO: Why app.use(express.json()); is removed
app.use(createCorsMiddleware());
// NOTE: Do NOT use express.json() here before the proxy. If the gateway
// parses the body it consumes the request stream and the proxy won't forward
// the raw body to upstream services which makes POST/PUT requests hang or fail.
// app.use(express.json());

setupRoutes(app);
// If gateway needs to expose any local JSON endpoints in the future we can
// enable express.json() for those specific routes only.

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS: Origin not allowed' });
  }
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`API Gateway listening on port ${PORT}`);
});

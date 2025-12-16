import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import { prisma } from './config';
import { createCorsMiddleware } from 'shared';
import userRoutes from './routes/userRoutes';

(async () => {
    const app = express();
    const PORT = Number(process.env.USER_SERVICE_PORT) || 3002;

    app.use(createCorsMiddleware());
    app.use(express.json());
    app.use(morgan('dev'));
    app.get('/health', (_req, res) => res.json({ status: 'ok' }));
    app.use('/', userRoutes());

    app.listen(PORT, () => {
        console.log(`User Service listening on port ${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
})();

import express from 'express'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { createCorsMiddleware, logger } from 'shared'
import clashRoutes from './routes/clash'

dotenv.config()

const app = express()
const PORT = process.env.CLASH_DATA_SERVICE_PORT || 3004

// Middleware
app.use(morgan('dev'))
app.use(createCorsMiddleware())
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'clash-data-service',
        timestamp: new Date().toISOString(),
        apiKeyConfigured: !!process.env.CLASH_ROYALE_API_KEY,
    })
})

// Routes
app.use('/', clashRoutes)

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error:', err)
    res.status(500).json({
        error: 'InternalServerError',
        message: err.message || 'An unexpected error occurred',
    })
})

app.listen(PORT, () => {
    logger.info(`🚀 Clash Data Service listening on port ${PORT}`)
    if (process.env.CLASH_ROYALE_API_KEY) {
        logger.info('✅ Clash Royale API key configured')
    } else {
        logger.warn('⚠️  Clash Royale API key NOT configured - service will not work')
    }
})

import express from 'express'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { createCorsMiddleware, logger } from 'shared'
import { initDatabase } from './database'
import itemRoutes from './routes/items'

dotenv.config()

const app = express()
const PORT = process.env.ITEM_SERVICE_PORT || 3003

// Middleware
app.use(morgan('dev'))
app.use(createCorsMiddleware())
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'item-service',
        timestamp: new Date().toISOString(),
    })
})

// Routes
app.use('/items', itemRoutes)

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error:', err)
    res.status(500).json({
        error: 'InternalServerError',
        message: err.message || 'An unexpected error occurred',
    })
})

// Initialize database and start server
async function start() {
    try {
        await initDatabase()

        app.listen(PORT, () => {
            logger.info(`🚀 Item Service listening on port ${PORT}`)
        })
    } catch (error) {
        logger.error('Failed to start Item Service:', error)
        process.exit(1)
    }
}

start()

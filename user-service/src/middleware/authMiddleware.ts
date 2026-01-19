import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../services/authService'
import { logger } from 'shared'

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'AuthenticationError',
                message: 'No token provided',
            })
        }

        const token = authHeader.substring(7) // Remove 'Bearer ' prefix
        const decoded = verifyToken(token)

            // Attach user info to request
            ; (req as any).userId = decoded.userId
            ; (req as any).userEmail = decoded.email

        next()
    } catch (error) {
        logger.error('Auth middleware error:', error)
        res.status(401).json({
            error: 'AuthenticationError',
            message: 'Invalid or expired token',
        })
    }
}

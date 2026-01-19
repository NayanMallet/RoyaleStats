import { Request, Response } from 'express'
import { getDatabase } from '../database'
import { hashPassword, verifyPassword, generateToken } from '../services/authService'
import { logger } from 'shared'
import type { User } from 'shared'

export async function register(req: Request, res: Response) {
    try {
        const { name, email, password } = req.body

        if (!name || !email || !password) {
            return res.status(400).json({
                error: 'ValidationError',
                message: 'Name, email, and password are required',
            })
        }

        const db = getDatabase()

        // Check if user already exists  
        const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
        if (existingUser) {
            return res.status(409).json({
                error: 'ConflictError',
                message: 'User with this email already exists',
            })
        }

        // Hash password
        const hashedPassword = await hashPassword(password)

        // Insert user
        const result = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)').run(
            name,
            email,
            hashedPassword,
        )

        const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(result.lastInsertRowid) as User

        logger.info(`User registered: ${email}`)
        res.status(201).json(user)
    } catch (error) {
        logger.error('Error in register:', error)
        res.status(500).json({ error: 'InternalServerError', message: 'Failed to register user' })
    }
}

export async function login(req: Request, res: Response) {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({
                error: 'ValidationError',
                message: 'Email and password are required',
            })
        }

        const db = getDatabase()
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as (User & { password: string }) | undefined

        if (!user) {
            return res.status(401).json({
                error: 'AuthenticationError',
                message: 'Invalid email or password',
            })
        }

        // Verify password
        const isValid = await verifyPassword(password, user.password)
        if (!isValid) {
            return res.status(401).json({
                error: 'AuthenticationError',
                message: 'Invalid email or password',
            })
        }

        // Generate token
        const token = generateToken(user.id, user.email)

        logger.info(`User logged in: ${email}`)
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                created_at: user.created_at,
            },
        })
    } catch (error) {
        logger.error('Error in login:', error)
        res.status(500).json({ error: 'InternalServerError', message: 'Failed to login' })
    }
}

export async function getMe(req: Request, res: Response) {
    try {
        // User ID should be attached by auth middleware
        const userId = (req as any).userId

        if (!userId) {
            return res.status(401).json({
                error: 'AuthenticationError',
                message: 'Not authenticated',
            })
        }

        const db = getDatabase()
        const user = db.prepare('SELECT id, name, email, created_at, updated_at FROM users WHERE id = ?').get(userId) as User | undefined

        if (!user) {
            return res.status(404).json({
                error: 'NotFoundError',
                message: 'User not found',
            })
        }

        res.json(user)
    } catch (error) {
        logger.error('Error in getMe:', error)
        res.status(500).json({ error: 'InternalServerError', message: 'Failed to get user' })
    }
}

export async function updateMe(req: Request, res: Response) {
    try {
        const userId = (req as any).userId
        const { name, email } = req.body

        if (!name && !email) {
            return res.status(400).json({
                error: 'ValidationError',
                message: 'At least one field (name or email) is required',
            })
        }

        const db = getDatabase()

        // Build update query dynamically
        const updates: string[] = []
        const params: any[] = []

        if (name) {
            updates.push('name = ?')
            params.push(name)
        }
        if (email) {
            updates.push('email = ?')
            params.push(email)
        }

        updates.push('updated_at = CURRENT_TIMESTAMP')
        params.push(userId)

        db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params)

        const user = db.prepare('SELECT id, name, email, created_at, updated_at FROM users WHERE id = ?').get(userId) as User

        logger.info(`User updated: ${userId}`)
        res.json(user)
    } catch (error) {
        logger.error('Error in updateMe:', error)
        res.status(500).json({ error: 'InternalServerError', message: 'Failed to update user' })
    }
}

export async function deleteMe(req: Request, res: Response) {
    try {
        const userId = (req as any).userId

        const db = getDatabase()
        db.prepare('DELETE FROM users WHERE id = ?').run(userId)

        logger.info(`User deleted: ${userId}`)
        res.status(204).send()
    } catch (error) {
        logger.error('Error in deleteMe:', error)
        res.status(500).json({ error: 'InternalServerError', message: 'Failed to delete user' })
    }
}

export async function listUsers(req: Request, res: Response) {
    try {
        const db = getDatabase()
        const users = db.prepare('SELECT id, name, email, created_at, updated_at FROM users').all() as User[]

        res.json(users)
    } catch (error) {
        logger.error('Error in listUsers:', error)
        res.status(500).json({ error: 'InternalServerError', message: 'Failed to list users' })
    }
}

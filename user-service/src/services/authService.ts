import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { logger } from 'shared'

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_in_production'
const SALT_ROUNDS = 10

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(
    password: string,
    hashedPassword: string,
): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword)
}

export function generateToken(userId: number, email: string): string {
    return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): { userId: number; email: string } {
    try {
        return jwt.verify(token, JWT_SECRET) as { userId: number; email: string }
    } catch (error) {
        logger.error('Invalid token:', error)
        throw new Error('Invalid or expired token')
    }
}

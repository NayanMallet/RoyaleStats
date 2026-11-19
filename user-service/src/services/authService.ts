import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getJwtSecret, verifyAccessToken } from 'shared';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(userId: number, email: string): string {
  return jwt.sign({ userId, email }, getJwtSecret(), { expiresIn: '7d' });
}

// Same secret and checks as the other services (shared/src/auth.ts): 401 on an invalid token.
export function verifyToken(token: string): { userId: number; email: string } {
  return verifyAccessToken(token);
}

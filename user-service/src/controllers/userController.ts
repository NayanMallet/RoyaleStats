import { Request, Response } from 'express';
import { getDatabase } from '../database';
import { hashPassword, verifyPassword, generateToken } from '../services/authService';
import { parseLogin, parseProfileUpdate, parseRegistration } from '../validation';
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  getAuthenticatedUser,
  logger,
} from 'shared';
import type { User } from 'shared';

// Errors are thrown: Express 5 forwards them, sync or async, to the shared error handler.

const PUBLIC_COLUMNS = 'id, name, email, created_at, updated_at';
const EMAIL_TAKEN = 'Un compte existe déjà avec cet email.';

// Emails are stored lower-cased since RST-29; lower() also finds accounts created before.
function findIdByEmail(email: string): { id: number } | undefined {
  return getDatabase().prepare('SELECT id FROM users WHERE lower(email) = ?').get(email) as
    | { id: number }
    | undefined;
}

export async function register(req: Request, res: Response) {
  const { name, email, password } = parseRegistration(req.body);

  if (findIdByEmail(email)) {
    throw new ConflictError(EMAIL_TAKEN);
  }

  const hashedPassword = await hashPassword(password);

  // A concurrent registration with the same email fails the UNIQUE constraint → 409 as well.
  const db = getDatabase();
  const result = db
    .prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)')
    .run(name, email, hashedPassword);

  const user = db
    .prepare('SELECT id, name, email, created_at FROM users WHERE id = ?')
    .get(result.lastInsertRowid) as User;

  logger.info('User registered', { userId: user.id });
  res.status(201).json(user);
}

export async function login(req: Request, res: Response) {
  const { email, password } = parseLogin(req.body);

  const user = getDatabase().prepare('SELECT * FROM users WHERE lower(email) = ?').get(email) as
    | (User & { password: string })
    | undefined;

  // Same message for an unknown email and a wrong password: do not reveal which accounts exist.
  if (!user || !(await verifyPassword(password, user.password))) {
    throw new UnauthorizedError('Email ou mot de passe incorrect.');
  }

  const token = generateToken(user.id, user.email);

  logger.info('User logged in', { userId: user.id });
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
    },
  });
}

export async function getMe(req: Request, res: Response) {
  // The user comes from the token verified by requireAuth()
  const { userId } = getAuthenticatedUser(res);

  const user = getDatabase()
    .prepare(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ?`)
    .get(userId) as User | undefined;

  if (!user) {
    throw new NotFoundError('Utilisateur introuvable.', { code: 'UserNotFound' });
  }

  res.json(user);
}

export async function updateMe(req: Request, res: Response) {
  const { userId } = getAuthenticatedUser(res);
  const { name, email } = parseProfileUpdate(req.body);

  if (email) {
    const owner = findIdByEmail(email);
    if (owner && owner.id !== userId) {
      throw new ConflictError(EMAIL_TAKEN, { details: { email: EMAIL_TAKEN } });
    }
  }

  const updates: string[] = [];
  const params: unknown[] = [];

  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name);
  }
  if (email !== undefined) {
    updates.push('email = ?');
    params.push(email);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(userId);

  const db = getDatabase();
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const user = db.prepare(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ?`).get(userId) as
    | User
    | undefined;
  if (!user) {
    throw new NotFoundError('Utilisateur introuvable.', { code: 'UserNotFound' });
  }

  logger.info('User updated', { userId });
  res.json(user);
}

export async function deleteMe(req: Request, res: Response) {
  const { userId } = getAuthenticatedUser(res);

  getDatabase().prepare('DELETE FROM users WHERE id = ?').run(userId);

  logger.info('User deleted', { userId });
  res.status(204).send();
}

import { Request, Response } from 'express';
import { getDatabase } from '../database';
import { hashPassword, verifyPassword, generateToken } from '../services/authService';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError, logger } from 'shared';
import type { User } from 'shared';

// Errors are thrown: Express 5 forwards them, sync or async, to the shared error handler.

export async function register(req: Request, res: Response) {
  const { name, email, password } = req.body ?? {};

  if (!name || !email || !password) {
    throw new ValidationError('Le nom, l’email et le mot de passe sont obligatoires.');
  }

  const db = getDatabase();

  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existingUser) {
    throw new ConflictError('Un compte existe déjà avec cet email.');
  }

  const hashedPassword = await hashPassword(password);

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
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    throw new ValidationError('L’email et le mot de passe sont obligatoires.');
  }

  const db = getDatabase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as
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
  // User ID is attached by the auth middleware
  const userId = (req as any).userId;

  if (!userId) {
    throw new UnauthorizedError();
  }

  const db = getDatabase();
  const user = db
    .prepare('SELECT id, name, email, created_at, updated_at FROM users WHERE id = ?')
    .get(userId) as User | undefined;

  if (!user) {
    throw new NotFoundError('Utilisateur introuvable.', { code: 'UserNotFound' });
  }

  res.json(user);
}

export async function updateMe(req: Request, res: Response) {
  const userId = (req as any).userId;
  const { name, email } = req.body ?? {};

  if (!name && !email) {
    throw new ValidationError('Indiquez au moins un champ à modifier : nom ou email.');
  }

  const db = getDatabase();

  // Build update query dynamically
  const updates: string[] = [];
  const params: any[] = [];

  if (name) {
    updates.push('name = ?');
    params.push(name);
  }
  if (email) {
    updates.push('email = ?');
    params.push(email);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(userId);

  // An email already used by another account fails the UNIQUE constraint: the shared error
  // handler turns it into a 409 ConflictError.
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const user = db
    .prepare('SELECT id, name, email, created_at, updated_at FROM users WHERE id = ?')
    .get(userId) as User;

  logger.info('User updated', { userId });
  res.json(user);
}

export async function deleteMe(req: Request, res: Response) {
  const userId = (req as any).userId;

  const db = getDatabase();
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);

  logger.info('User deleted', { userId });
  res.status(204).send();
}

export async function listUsers(req: Request, res: Response) {
  const db = getDatabase();
  const users = db
    .prepare('SELECT id, name, email, created_at, updated_at FROM users')
    .all() as User[];

  res.json(users);
}

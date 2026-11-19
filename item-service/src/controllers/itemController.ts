import { Request, Response } from 'express';
import { getDatabase } from '../database';
import { NotFoundError, ValidationError, logger } from 'shared';
import type { Item } from 'shared';

// Errors are thrown: Express 5 forwards them, sync or async, to the shared error handler.

const itemNotFound = () => new NotFoundError('Objet introuvable.', { code: 'ItemNotFound' });

export async function listItems(req: Request, res: Response) {
  const db = getDatabase();
  const items = db.prepare('SELECT * FROM items ORDER BY created_at DESC').all() as Item[];
  res.json(items);
}

export async function createItem(req: Request, res: Response) {
  const { name, description } = req.body ?? {};

  if (!name) {
    throw new ValidationError('Le nom est obligatoire.');
  }

  const db = getDatabase();
  const result = db
    .prepare('INSERT INTO items (name, description) VALUES (?, ?)')
    .run(name, description || null);

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid) as Item;

  logger.info('Item created', { itemId: item.id });
  res.status(201).json(item);
}

export async function getItem(req: Request, res: Response) {
  const { id } = req.params;
  const db = getDatabase();
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as Item | undefined;

  if (!item) throw itemNotFound();

  res.json(item);
}

export async function updateItem(req: Request, res: Response) {
  const { id } = req.params;
  const { name, description } = req.body ?? {};

  if (!name && !description) {
    throw new ValidationError('Indiquez au moins un champ à modifier : nom ou description.');
  }

  const db = getDatabase();

  // Build update query dynamically
  const updates: string[] = [];
  const params: any[] = [];

  if (name) {
    updates.push('name = ?');
    params.push(name);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }

  params.push(id);

  const result = db.prepare(`UPDATE items SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  if (result.changes === 0) throw itemNotFound();

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as Item;

  logger.info('Item updated', { itemId: id });
  res.json(item);
}

export async function deleteItem(req: Request, res: Response) {
  const { id } = req.params;
  const db = getDatabase();

  const result = db.prepare('DELETE FROM items WHERE id = ?').run(id);

  if (result.changes === 0) throw itemNotFound();

  logger.info('Item deleted', { itemId: id });
  res.status(204).send();
}

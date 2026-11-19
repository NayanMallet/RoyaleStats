import { Request, Response } from 'express';
import fetch from 'node-fetch';
import { getDatabase } from '../database';
import {
  ConflictError,
  NotFoundError,
  UpstreamError,
  ValidationError,
  logger,
  requestIdHeaders,
} from 'shared';
import type { PlayerLink } from 'shared';

// Errors are thrown: Express 5 forwards them, sync or async, to the shared error handler.

const CLASH_DATA_SERVICE_URL =
  process.env.CLASH_DATA_SERVICE_URL || 'http://clash-data-service:3004';

const linkNotFound = () =>
  new NotFoundError('Aucun joueur n’est associé à ce compte.', { code: 'LinkNotFound' });

// Helper to normalize player tags
function normalizeTag(tag: string): string {
  const normalized = tag.startsWith('#') ? tag.slice(1) : tag;
  return normalized.toUpperCase();
}

/**
 * Checks that the player exists through the Clash Data Service.
 * Unknown player → 404; Clash Data Service down or failing → 503/502, not "player not found".
 */
async function ensurePlayerExists(tag: string): Promise<void> {
  const normalized = normalizeTag(tag);
  let response;
  try {
    response = await fetch(`${CLASH_DATA_SERVICE_URL}/players/%23${normalized}`, {
      headers: requestIdHeaders(),
    });
  } catch (error) {
    throw new UpstreamError(503, undefined, {
      internalDetails: { service: 'clash-data-service' },
      cause: error,
    });
  }

  if (response.status === 404) {
    throw new NotFoundError('Aucun joueur Clash Royale ne correspond à ce tag.', {
      code: 'PlayerNotFound',
    });
  }
  if (!response.ok) {
    throw new UpstreamError(response.status === 503 ? 503 : 502, undefined, {
      internalDetails: { service: 'clash-data-service', status: response.status },
    });
  }
}

export async function createLink(req: Request, res: Response) {
  const { userId, playerTag } = req.body ?? {};

  if (!userId || !playerTag) {
    throw new ValidationError('L’utilisateur et le tag du joueur sont obligatoires.');
  }

  const normalized = normalizeTag(playerTag);

  await ensurePlayerExists(normalized);

  const db = getDatabase();

  // Check if user already has a link
  const existing = db.prepare('SELECT * FROM player_links WHERE user_id = ?').get(userId);
  if (existing) {
    throw new ConflictError('Ce compte est déjà associé à un joueur.');
  }

  // Check if player_tag is already linked to another user
  const tagLinked = db
    .prepare('SELECT * FROM player_links WHERE player_tag = ?')
    .get(`#${normalized}`);
  if (tagLinked) {
    throw new ConflictError('Ce tag est déjà associé à un autre compte.');
  }

  // Create link. A concurrent request linking the same tag fails the UNIQUE constraint, which
  // the shared error handler also answers with a 409.
  const result = db
    .prepare('INSERT INTO player_links (user_id, player_tag) VALUES (?, ?)')
    .run(userId, `#${normalized}`);

  const link = db
    .prepare('SELECT * FROM player_links WHERE id = ?')
    .get(result.lastInsertRowid) as PlayerLink;

  logger.info('Link created', { userId, playerTag: `#${normalized}` });
  res.status(201).json(link);
}

export async function updateLink(req: Request, res: Response) {
  const { userId } = req.params;
  const { twitter, twitch } = req.body ?? {};

  const db = getDatabase();

  const existing = db.prepare('SELECT * FROM player_links WHERE user_id = ?').get(userId);
  if (!existing) throw linkNotFound();

  // Only update fields that are provided
  const updates = [];
  const params = [];

  if (twitter !== undefined) {
    updates.push('twitter = ?');
    params.push(twitter);
  }

  if (twitch !== undefined) {
    updates.push('twitch = ?');
    params.push(twitch);
  }

  if (updates.length > 0) {
    params.push(userId);
    db.prepare(`UPDATE player_links SET ${updates.join(', ')} WHERE user_id = ?`).run(...params);
  }

  const link = db.prepare('SELECT * FROM player_links WHERE user_id = ?').get(userId) as PlayerLink;

  logger.info('Link updated', { userId });
  res.json(link);
}

export async function getLink(req: Request, res: Response) {
  const { userId } = req.params;

  const db = getDatabase();
  const link = db.prepare('SELECT * FROM player_links WHERE user_id = ?').get(userId) as
    | PlayerLink
    | undefined;

  if (!link) throw linkNotFound();

  res.json(link);
}

export async function deleteLink(req: Request, res: Response) {
  const { userId } = req.params;

  const db = getDatabase();
  const result = db.prepare('DELETE FROM player_links WHERE user_id = ?').run(userId);

  if (result.changes === 0) throw linkNotFound();

  logger.info('Link deleted', { userId });
  res.status(204).send();
}

export async function getLinkByTag(req: Request, res: Response) {
  const { tag } = req.params;
  if (typeof tag !== 'string') {
    throw new ValidationError('Tag de joueur invalide.', { code: 'InvalidPlayerTag' });
  }
  const normalized = normalizeTag(tag); // Removes # and uppercases

  const db = getDatabase();
  // We store tags with # in database
  const link = db
    .prepare('SELECT * FROM player_links WHERE player_tag = ?')
    .get(`#${normalized}`) as PlayerLink | undefined;

  if (!link) {
    throw new NotFoundError('Aucun compte n’est associé à ce tag.', { code: 'LinkNotFound' });
  }

  res.json(link);
}

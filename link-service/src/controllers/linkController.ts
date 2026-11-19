import { Request, Response } from 'express';
import fetch from 'node-fetch';
import { getDatabase } from '../database';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UpstreamError,
  ValidationError,
  TIMEOUTS_MS,
  getAuthenticatedUser,
  isTimeoutError,
  logger,
  requestIdHeaders,
  timeoutFromEnv,
} from 'shared';
import type { PlayerLink } from 'shared';

// Errors are thrown: Express 5 forwards them, sync or async, to the shared error handler.

const CLASH_DATA_SERVICE_URL =
  process.env.CLASH_DATA_SERVICE_URL || 'http://clash-data-service:3004';
// Longer than the Clash Royale call inside clash-data-service, shorter than the Gateway's limit.
const SERVICE_CALL_TIMEOUT_MS = timeoutFromEnv('SERVICE_CALL_TIMEOUT_MS', TIMEOUTS_MS.serviceCall);

const linkNotFound = () =>
  new NotFoundError('Aucun joueur n’est associé à ce compte.', { code: 'LinkNotFound' });

/**
 * The account a private route acts on: always the one of the verified token. A userId in the URL
 * or the body must match it, so that user A can neither read nor change the link of user B.
 */
function ownUserId(res: Response, requestedUserId?: unknown): number {
  const { userId } = getAuthenticatedUser(res);
  if (requestedUserId === undefined) return userId;

  const requested = Number(requestedUserId);
  if (!Number.isInteger(requested) || requested <= 0) {
    throw new ValidationError('Identifiant d’utilisateur invalide.');
  }
  if (requested !== userId) {
    throw new ForbiddenError('Vous ne pouvez agir que sur votre propre compte.');
  }
  return userId;
}

/** Fields of a link anyone can see on a player's profile: no account id. */
function toPublicLink(link: PlayerLink) {
  return {
    player_tag: link.player_tag,
    twitter: link.twitter ?? null,
    twitch: link.twitch ?? null,
    linked_at: link.linked_at,
  };
}

const SOCIAL_HANDLE = /^[A-Za-z0-9_]{1,50}$/;

/** A social handle is optional: undefined keeps it, '' or null clears it, otherwise 1-50 chars. */
function socialHandle(value: unknown, network: string): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value === 'string' && SOCIAL_HANDLE.test(value.replace(/^@/, ''))) {
    return value.replace(/^@/, '');
  }
  throw new ValidationError(`Pseudo ${network} invalide : lettres, chiffres et _ uniquement.`, {
    details: { [network.toLowerCase()]: 'Format invalide' },
  });
}

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
      signal: AbortSignal.timeout(SERVICE_CALL_TIMEOUT_MS),
    });
  } catch (error) {
    throw new UpstreamError(isTimeoutError(error) ? 504 : 503, undefined, {
      internalDetails: { service: 'clash-data-service', timeoutMs: SERVICE_CALL_TIMEOUT_MS },
      cause: error,
    });
  }

  if (response.status === 404) {
    throw new NotFoundError('Aucun joueur Clash Royale ne correspond à ce tag.', {
      code: 'PlayerNotFound',
    });
  }
  if (!response.ok) {
    // 503 and 504 keep their meaning (Clash Royale down or too slow); anything else is a 502.
    const status = response.status === 503 || response.status === 504 ? response.status : 502;
    throw new UpstreamError(status, undefined, {
      internalDetails: { service: 'clash-data-service', status: response.status },
    });
  }
}

export async function createLink(req: Request, res: Response) {
  const { userId: requestedUserId, playerTag } = req.body ?? {};
  // The account comes from the token; a userId in the body is only checked against it.
  const userId = ownUserId(res, requestedUserId);

  if (!playerTag || typeof playerTag !== 'string') {
    throw new ValidationError('Le tag du joueur est obligatoire.');
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
  const userId = ownUserId(res, req.params.userId);
  const twitter = socialHandle(req.body?.twitter, 'Twitter');
  const twitch = socialHandle(req.body?.twitch, 'Twitch');

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
  const userId = ownUserId(res, req.params.userId);

  const db = getDatabase();
  const link = db.prepare('SELECT * FROM player_links WHERE user_id = ?').get(userId) as
    | PlayerLink
    | undefined;

  if (!link) throw linkNotFound();

  res.json(link);
}

export async function deleteLink(req: Request, res: Response) {
  const userId = ownUserId(res, req.params.userId);

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

  res.json(toPublicLink(link));
}

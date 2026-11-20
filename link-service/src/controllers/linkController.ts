import { Request, Response } from 'express';
import { getDatabase } from '../database';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UpstreamError,
  ValidationError,
  getAuthenticatedUser,
  logger,
} from 'shared';
import type { PlayerLink } from 'shared';
import { getFromClashDataService, playerPath } from '../clashDataClient';
import {
  LOCKABLE,
  MAX_TROPHY_GOAL,
  describeAchievement,
  evaluateAchievements,
  goalProgress,
  isAchievementCode,
} from '../achievements';

// Errors are thrown: Express 5 forwards them, sync or async, to the shared error handler.

/** Columns of a link returned to its owner: not the internal snapshot of the achievements. */
const LINK_COLUMNS = 'id, user_id, player_tag, twitter, twitch, trophy_goal, linked_at';

interface LinkRow extends PlayerLink {
  snapshot_trophies: number | null;
  snapshot_arena_id: number | null;
}

interface ClashProfile {
  trophies?: number;
  arena?: { id?: number; name?: string };
}

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

// Player tags: letters and digits only once the leading # is removed. The exact Clash Royale
// alphabet is checked by the Clash Data Service; here we only refuse what can never be a tag.
const TAG_FORMAT = /^[0-9A-Z]{3,15}$/;

/** " #2pp8vj9q " → "2PP8VJ9Q": trimmed, without leading #, upper-cased. 400 if it is not a tag. */
export function normalizeTag(tag: unknown): string {
  const normalized = typeof tag === 'string' ? tag.trim().replace(/^#+/, '').toUpperCase() : '';
  if (!TAG_FORMAT.test(normalized)) {
    throw new ValidationError('Tag de joueur invalide : lettres et chiffres après le #.', {
      code: 'InvalidPlayerTag',
      details: { playerTag: 'Format invalide' },
    });
  }
  return normalized;
}

/** Integer between 1 and MAX_TROPHY_GOAL; undefined keeps it, '' or null clears it. */
function trophyGoal(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value > 0 &&
    value <= MAX_TROPHY_GOAL
  ) {
    return value;
  }
  throw new ValidationError(
    `Objectif de trophées invalide : un nombre entier entre 1 et ${MAX_TROPHY_GOAL}.`,
    { details: { trophyGoal: 'Format invalide' } },
  );
}

export async function createLink(req: Request, res: Response) {
  const { userId: requestedUserId, playerTag } = req.body ?? {};
  // The account comes from the token; a userId in the body is only checked against it.
  const userId = ownUserId(res, requestedUserId);

  if (playerTag === undefined || playerTag === null || playerTag === '') {
    throw new ValidationError('Le tag du joueur est obligatoire.', {
      details: { playerTag: 'Champ obligatoire' },
    });
  }

  const normalized = normalizeTag(playerTag);

  // Unknown player → 404; Clash Data Service down or failing → 503/504/502, not "not found".
  const profile = await getFromClashDataService<ClashProfile>(playerPath(`#${normalized}`));

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

  // Create link. The checks above and this insert run synchronously (better-sqlite3), with no
  // await in between: two concurrent requests cannot both pass them. The UNIQUE constraints of
  // player_links remain the last guard, answered 409 by the shared error handler.
  // The profile read above is the first snapshot of the achievements ("new arena" compares the
  // next ones with it), and the link unlocks "linked" in the same transaction.
  const link = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO player_links (user_id, player_tag, snapshot_trophies, snapshot_arena_id, snapshot_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        userId,
        `#${normalized}`,
        typeof profile.trophies === 'number' ? profile.trophies : null,
        typeof profile.arena?.id === 'number' ? profile.arena.id : null,
        new Date().toISOString(),
      );
    db.prepare('INSERT INTO achievements (player_link_id, code, unlocked_at) VALUES (?, ?, ?)').run(
      result.lastInsertRowid,
      'linked',
      new Date().toISOString(),
    );
    return db
      .prepare(`SELECT ${LINK_COLUMNS} FROM player_links WHERE id = ?`)
      .get(result.lastInsertRowid) as PlayerLink;
  })();

  logger.info('Link created', { userId, playerTag: `#${normalized}` });
  res.status(201).json(link);
}

export async function updateLink(req: Request, res: Response) {
  const userId = ownUserId(res, req.params.userId);
  const twitter = socialHandle(req.body?.twitter, 'Twitter');
  const twitch = socialHandle(req.body?.twitch, 'Twitch');
  const goal = trophyGoal(req.body?.trophyGoal);

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

  if (goal !== undefined) {
    updates.push('trophy_goal = ?');
    params.push(goal);
  }

  if (updates.length > 0) {
    params.push(userId);
    db.prepare(`UPDATE player_links SET ${updates.join(', ')} WHERE user_id = ?`).run(...params);
  }

  const link = db
    .prepare(`SELECT ${LINK_COLUMNS} FROM player_links WHERE user_id = ?`)
    .get(userId) as PlayerLink;

  logger.info('Link updated', { userId });
  res.json(link);
}

export async function getLink(req: Request, res: Response) {
  const userId = ownUserId(res, req.params.userId);

  const db = getDatabase();
  const link = db
    .prepare(`SELECT ${LINK_COLUMNS} FROM player_links WHERE user_id = ?`)
    .get(userId) as PlayerLink | undefined;

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
  const normalized = normalizeTag(req.params.tag); // Removes # and uppercases, 400 if invalid

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

/**
 * Reads the profile and the battle log of the player, stores the achievements they unlock and the
 * new snapshot. When clash-data-service cannot answer, the stored achievements are still shown,
 * with `upToDate: false`: never an error page because Clash Royale is down.
 */
async function refreshAchievements(
  link: LinkRow,
): Promise<{ trophies: number | null; upToDate: boolean }> {
  let profile: ClashProfile;
  let battleLog: unknown;
  try {
    [profile, battleLog] = await Promise.all([
      getFromClashDataService<ClashProfile>(playerPath(link.player_tag)),
      getFromClashDataService<unknown>(playerPath(link.player_tag, '/battles')),
    ]);
  } catch (error) {
    if (error instanceof UpstreamError || error instanceof NotFoundError) {
      logger.warn('Achievements not refreshed: clash-data-service did not answer', {
        playerTag: link.player_tag,
        status: error.statusCode,
      });
      return { trophies: link.snapshot_trophies, upToDate: false };
    }
    throw error;
  }

  const now = new Date().toISOString();
  const evaluation = evaluateAchievements({
    playerTag: link.player_tag,
    profile,
    battleLog,
    trophyGoal: link.trophy_goal ?? null,
    snapshot: { trophies: link.snapshot_trophies, arenaId: link.snapshot_arena_id },
    now,
  });

  const db = getDatabase();
  db.transaction(() => {
    // INSERT OR IGNORE: an achievement already unlocked keeps its first date.
    const insert = db.prepare(
      'INSERT OR IGNORE INTO achievements (player_link_id, code, detail, unlocked_at) VALUES (?, ?, ?, ?)',
    );
    for (const achievement of evaluation.unlocked) {
      insert.run(link.id, achievement.code, achievement.detail, achievement.unlockedAt);
    }
    db.prepare(
      'UPDATE player_links SET snapshot_trophies = ?, snapshot_arena_id = ?, snapshot_at = ? WHERE id = ?',
    ).run(evaluation.snapshot.trophies, evaluation.snapshot.arenaId, now, link.id);
  })();

  return {
    trophies: typeof profile.trophies === 'number' ? profile.trophies : null,
    upToDate: true,
  };
}

/** Goal, unlocked achievements (most recent first) and the ones still to unlock. */
async function progressionOf(link: LinkRow) {
  const { trophies, upToDate } = await refreshAchievements(link);

  const rows = getDatabase()
    .prepare(
      'SELECT code, detail, unlocked_at FROM achievements WHERE player_link_id = ? ORDER BY unlocked_at DESC, id DESC',
    )
    .all(link.id) as { code: string; detail: string; unlocked_at: string }[];
  const achievements = rows.flatMap((row) =>
    isAchievementCode(row.code)
      ? [{ ...describeAchievement(row.code, row.detail), unlockedAt: row.unlocked_at }]
      : [],
  );
  const unlockedCodes = new Set(rows.map((row) => row.code));

  return {
    goal: goalProgress(link.trophy_goal ?? null, trophies),
    achievements,
    locked: LOCKABLE.filter((code) => !unlockedCodes.has(code)).map((code) =>
      describeAchievement(code),
    ),
    upToDate,
  };
}

export async function getAchievements(req: Request, res: Response) {
  const userId = ownUserId(res, req.params.userId);

  const link = getDatabase().prepare('SELECT * FROM player_links WHERE user_id = ?').get(userId) as
    | LinkRow
    | undefined;
  if (!link) throw linkNotFound();

  res.json({ player_tag: link.player_tag, ...(await progressionOf(link)) });
}

/** Public share page: the public fields of the link, the goal and the achievements. */
export async function getShare(req: Request, res: Response) {
  const normalized = normalizeTag(req.params.tag);

  const link = getDatabase()
    .prepare('SELECT * FROM player_links WHERE player_tag = ?')
    .get(`#${normalized}`) as LinkRow | undefined;
  if (!link) {
    throw new NotFoundError('Aucun compte n’est associé à ce tag.', { code: 'LinkNotFound' });
  }

  res.json({ ...toPublicLink(link), ...(await progressionOf(link)) });
}

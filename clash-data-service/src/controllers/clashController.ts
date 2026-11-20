import { Request, Response } from 'express';
import { fetchFromClashAPI } from '../clashRoyaleClient';
import { cache } from '../cache';
import { NotFoundError, ValidationError } from 'shared';
import { summarizeRecentForm } from '../recentForm';

// Errors are thrown: Express 5 forwards them, sync or async, to the shared error handler.
// fetchFromClashAPI turns the Clash Royale API statuses into errors (404, 429, 503…).

// Helper to normalize player tags
function normalizeTag(tag: string): string {
  // Remove # if present
  const normalized = tag.startsWith('#') ? tag.slice(1) : tag;
  // Uppercase
  return normalized.toUpperCase();
}

const playerNotFound = () =>
  new NotFoundError('Aucun joueur ne correspond à ce tag.', { code: 'PlayerNotFound' });

const clanNotFound = () =>
  new NotFoundError('Aucun clan ne correspond à ce tag.', { code: 'ClanNotFound' });

// Calls to the Clash Royale API in progress, by cache key: identical requests arriving together
// share one call instead of each spending quota.
const inFlight = new Map<string, Promise<unknown>>();

/**
 * Answers from the cache, or fetches from the Clash Royale API and caches the result. Errors are
 * never cached. The `x-cache` header (HIT or MISS) shows which one answered.
 */
async function cached<T>(
  res: Response,
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
): Promise<T> {
  const hit = cache.get<T>(key);
  if (hit !== null) {
    res.setHeader('x-cache', 'HIT');
    return hit;
  }

  res.setHeader('x-cache', 'MISS');
  let pending = inFlight.get(key) as Promise<T> | undefined;
  if (!pending) {
    pending = load()
      .then((data) => {
        cache.set(key, data, ttlMs);
        return data;
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, pending);
  }
  return pending;
}

/** `limit` query parameter, kept within [1, max]; undefined when absent. */
function limitParam(req: Request, max: number, fallback?: number): number | undefined {
  if (req.query.limit === undefined) return fallback;
  const requested = Number(req.query.limit);
  if (!Number.isInteger(requested)) {
    throw new ValidationError('Le paramètre limit doit être un nombre entier.');
  }
  return Math.min(Math.max(requested, 1), max);
}

/** Player profile, cached for 5 minutes. The API expects %23 before the tag. */
function playerProfile(res: Response, normalized: string) {
  return cached(res, `player:${normalized}`, 5 * 60 * 1000, () =>
    fetchFromClashAPI(`/players/%23${normalized}`, { notFound: playerNotFound }),
  );
}

export async function getPlayer(req: Request, res: Response) {
  const normalized = normalizeTag(decodeURIComponent(req.params.playerTag as string));
  res.json(await playerProfile(res, normalized));
}

/** Battle log of a player, cached for 2 minutes (battles change frequently). */
function battleLog(res: Response, normalized: string) {
  return cached(res, `battles:${normalized}`, 2 * 60 * 1000, () =>
    fetchFromClashAPI(`/players/%23${normalized}/battlelog`, { notFound: playerNotFound }),
  );
}

export async function getPlayerBattles(req: Request, res: Response) {
  const normalized = normalizeTag(decodeURIComponent(req.params.playerTag as string));
  res.json(await battleLog(res, normalized));
}

/**
 * Recent form computed from the battle log (same cache). An empty log gives an empty sample with
 * `insufficientData`; an unavailable Clash Royale API stays an error (503/504), never a 0 %.
 * The API answers an empty battle log for a tag that does not exist, so the profile (usually
 * already cached: the client reads it first) tells an unknown player (404) from a player without
 * recent battles. The `x-cache` header is the one of the battle log, read last.
 */
export async function getPlayerSummary(req: Request, res: Response) {
  const normalized = normalizeTag(decodeURIComponent(req.params.playerTag as string));
  const [, log] = await Promise.all([playerProfile(res, normalized), battleLog(res, normalized)]);
  res.json({ playerTag: `#${normalized}`, ...summarizeRecentForm(normalized, log) });
}

export async function getCards(req: Request, res: Response) {
  // Cache for 24 hours (cards rarely change)
  const data = await cached(res, 'cards:all', 24 * 60 * 60 * 1000, () =>
    fetchFromClashAPI('/cards'),
  );
  res.json(data);
}

export async function getClan(req: Request, res: Response) {
  const normalized = normalizeTag(decodeURIComponent(req.params.clanTag as string));

  // Cache for 10 minutes
  const data = await cached(res, `clan:${normalized}`, 10 * 60 * 1000, () =>
    fetchFromClashAPI(`/clans/%23${normalized}`, { notFound: clanNotFound }),
  );
  res.json(data);
}

export async function getLeaderboards(req: Request, res: Response) {
  // List of season leaderboards (id + name), cached for 1 hour
  const data = await cached(res, 'leaderboards:list', 60 * 60 * 1000, () =>
    fetchFromClashAPI('/leaderboards'),
  );
  res.json(data);
}

export async function getLeaderboardRankings(req: Request, res: Response) {
  const { leaderboardId } = req.params;
  if (typeof leaderboardId !== 'string' || !/^\d+$/.test(leaderboardId)) {
    throw new ValidationError('L’identifiant du classement doit être un nombre.');
  }

  const requestedLimit = Number(req.query.limit ?? 20);
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 200) : 20;

  // Cache for 10 minutes
  const data = await cached(res, `leaderboard:${leaderboardId}:${limit}`, 10 * 60 * 1000, () =>
    fetchFromClashAPI(`/leaderboard/${leaderboardId}?limit=${limit}`, {
      notFound: () => new NotFoundError('Classement introuvable.', { code: 'LeaderboardNotFound' }),
    }),
  );
  res.json(data);
}

export async function getPathOfLegend(req: Request, res: Response) {
  // The front asks for the top 20; the meta-tracker worker omits limit to get the whole ranking.
  const limit = limitParam(req, 1000);
  const query = limit ? `?limit=${limit}` : '';
  const data = await cached(res, `leaderboard:pathoflegend:${limit ?? 'all'}`, 10 * 60 * 1000, () =>
    fetchFromClashAPI(`/locations/global/pathoflegend/players${query}`),
  );
  res.json(data);
}

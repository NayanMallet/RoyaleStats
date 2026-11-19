import { Request, Response } from 'express';
import { fetchFromClashAPI } from '../clashRoyaleClient';
import { cache } from '../cache';
import { NotFoundError, ValidationError } from 'shared';

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

/** Answers from the cache, or fetches from the Clash Royale API and caches the result. */
async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key) as T | undefined;
  if (hit) return hit;

  const data = await load();
  cache.set(key, data, ttlMs);
  return data;
}

export async function getPlayer(req: Request, res: Response) {
  const normalized = normalizeTag(decodeURIComponent(req.params.playerTag as string));

  // API expects %23 before the tag. Cache for 5 minutes.
  const data = await cached(`player:${normalized}`, 5 * 60 * 1000, () =>
    fetchFromClashAPI(`/players/%23${normalized}`, { notFound: playerNotFound }),
  );
  res.json(data);
}

export async function getPlayerBattles(req: Request, res: Response) {
  const normalized = normalizeTag(decodeURIComponent(req.params.playerTag as string));

  // Cache for 2 minutes (battles change frequently)
  const data = await cached(`battles:${normalized}`, 2 * 60 * 1000, () =>
    fetchFromClashAPI(`/players/%23${normalized}/battlelog`, { notFound: playerNotFound }),
  );
  res.json(data);
}

export async function getCards(req: Request, res: Response) {
  // Cache for 24 hours (cards rarely change)
  const data = await cached('cards:all', 24 * 60 * 60 * 1000, () => fetchFromClashAPI('/cards'));
  res.json(data);
}

export async function getClan(req: Request, res: Response) {
  const normalized = normalizeTag(decodeURIComponent(req.params.clanTag as string));

  // Cache for 10 minutes
  const data = await cached(`clan:${normalized}`, 10 * 60 * 1000, () =>
    fetchFromClashAPI(`/clans/%23${normalized}`, { notFound: clanNotFound }),
  );
  res.json(data);
}

export async function getLeaderboards(req: Request, res: Response) {
  // List of season leaderboards (id + name), cached for 1 hour
  const data = await cached('leaderboards:list', 60 * 60 * 1000, () =>
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
  const data = await cached(`leaderboard:${leaderboardId}:${limit}`, 10 * 60 * 1000, () =>
    fetchFromClashAPI(`/leaderboard/${leaderboardId}?limit=${limit}`, {
      notFound: () => new NotFoundError('Classement introuvable.', { code: 'LeaderboardNotFound' }),
    }),
  );
  res.json(data);
}

export async function getPathOfLegend(req: Request, res: Response) {
  const data = await cached('leaderboard:pathoflegend', 10 * 60 * 1000, () =>
    fetchFromClashAPI('/locations/global/pathoflegend/players'),
  );
  res.json(data);
}

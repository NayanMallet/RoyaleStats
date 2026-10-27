import { Request, Response } from 'express';
import { fetchFromClashAPI } from '../clashRoyaleClient';
import { cache } from '../cache';
import { logger } from 'shared';

// Helper to normalize player tags
function normalizeTag(tag: string): string {
  // Remove # if present
  const normalized = tag.startsWith('#') ? tag.slice(1) : tag;
  // Uppercase
  return normalized.toUpperCase();
}

export async function getPlayer(req: Request, res: Response) {
  try {
    const { playerTag } = req.params;
    const normalized = normalizeTag(decodeURIComponent(playerTag as string));
    const cacheKey = `player:${normalized}`;

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Fetch from API (API expects %23 before the tag)
    const data = await fetchFromClashAPI(`/players/%23${normalized}`);

    // Cache for 5 minutes
    cache.set(cacheKey, data, 5 * 60 * 1000);

    res.json(data);
  } catch (error) {
    logger.error('Error fetching player:', error);
    const statusCode = (error as any).message?.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: 'ClashAPIError',
      message: (error as Error).message || 'Failed to fetch player data',
    });
  }
}

export async function getPlayerBattles(req: Request, res: Response) {
  try {
    const { playerTag } = req.params;
    const normalized = normalizeTag(decodeURIComponent(playerTag as string));
    const cacheKey = `battles:${normalized}`;

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Fetch from API
    const data = await fetchFromClashAPI(`/players/%23${normalized}/battlelog`);

    // Cache for 2 minutes (battles change frequently)
    cache.set(cacheKey, data, 2 * 60 * 1000);

    res.json(data);
  } catch (error) {
    logger.error('Error fetching player battles:', error);
    const statusCode = (error as any).message?.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: 'ClashAPIError',
      message: (error as Error).message || 'Failed to fetch battle log',
    });
  }
}

export async function getCards(req: Request, res: Response) {
  try {
    const cacheKey = 'cards:all';

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Fetch from API
    const data = await fetchFromClashAPI('/cards');

    // Cache for 24 hours (cards rarely change)
    cache.set(cacheKey, data, 24 * 60 * 60 * 1000);

    res.json(data);
  } catch (error) {
    logger.error('Error fetching cards:', error);
    res.status(500).json({
      error: 'ClashAPIError',
      message: (error as Error).message || 'Failed to fetch cards',
    });
  }
}

export async function getClan(req: Request, res: Response) {
  try {
    const { clanTag } = req.params;
    const normalized = normalizeTag(decodeURIComponent(clanTag as string));
    const cacheKey = `clan:${normalized}`;

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Fetch from API
    const data = await fetchFromClashAPI(`/clans/%23${normalized}`);

    // Cache for 10 minutes
    cache.set(cacheKey, data, 10 * 60 * 1000);

    res.json(data);
  } catch (error) {
    logger.error('Error fetching clan:', error);
    const statusCode = (error as any).message?.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: 'ClashAPIError',
      message: (error as Error).message || 'Failed to fetch clan data',
    });
  }
}

export async function getLeaderboards(req: Request, res: Response) {
  try {
    const cacheKey = 'leaderboards:list';

    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // List of season leaderboards (id + name)
    const data = await fetchFromClashAPI('/leaderboards');
    cache.set(cacheKey, data, 60 * 60 * 1000); // 1 hour

    res.json(data);
  } catch (error) {
    logger.error('Error fetching leaderboards list:', error);
    res.status(500).json({
      error: 'ClashAPIError',
      message: (error as Error).message || 'Failed to fetch leaderboards',
    });
  }
}

export async function getLeaderboardRankings(req: Request, res: Response) {
  try {
    const { leaderboardId } = req.params;
    if (typeof leaderboardId !== 'string' || !/^\d+$/.test(leaderboardId)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'leaderboardId must be a numeric id',
      });
    }

    const requestedLimit = Number(req.query.limit ?? 20);
    const limit = Number.isInteger(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 200)
      : 20;
    const cacheKey = `leaderboard:${leaderboardId}:${limit}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const data = await fetchFromClashAPI(`/leaderboard/${leaderboardId}?limit=${limit}`);
    cache.set(cacheKey, data, 10 * 60 * 1000); // 10 minutes

    res.json(data);
  } catch (error) {
    logger.error('Error fetching leaderboard rankings:', error);
    const statusCode = (error as any).message?.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: 'ClashAPIError',
      message: (error as Error).message || 'Failed to fetch leaderboard rankings',
    });
  }
}

export async function getPathOfLegend(req: Request, res: Response) {
  try {
    const cacheKey = 'leaderboard:pathoflegend';

    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const data = await fetchFromClashAPI('/locations/global/pathoflegend/players');
    cache.set(cacheKey, data, 10 * 60 * 1000);

    res.json(data);
  } catch (error) {
    logger.error('Error fetching path of legend:', error);
    res.status(500).json({
      error: 'ClashAPIError',
      message: (error as Error).message || 'Failed to fetch path of legend',
    });
  }
}

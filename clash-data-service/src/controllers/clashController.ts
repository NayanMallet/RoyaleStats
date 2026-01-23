import { Request, Response } from 'express';
import { fetchFromClashAPI } from '../clashRoyaleClient';
import { cache } from '../cache';
import { logger } from 'shared';

// Helper to normalize player tags
function normalizeTag(tag: string): string {
  // Remove # if present
  let normalized = tag.startsWith('#') ? tag.slice(1) : tag;
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

export async function getLeaderboard(req: Request, res: Response) {
  try {
    const cacheKey = 'leaderboard:global';

    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const data = await fetchFromClashAPI('/locations/global/rankings/players');
    cache.set(cacheKey, data, 10 * 60 * 1000); // 10 minutes

    res.json(data);
  } catch (error) {
    logger.error('Error fetching leaderboard:', error);
    res.status(500).json({
      error: 'ClashAPIError',
      message: (error as Error).message || 'Failed to fetch leaderboard',
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

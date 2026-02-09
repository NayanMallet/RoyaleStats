import { Request, Response } from 'express';
import fetch from 'node-fetch';
import { getDatabase } from '../database';
import { logger } from 'shared';
import type { PlayerLink } from 'shared';

const CLASH_DATA_SERVICE_URL =
  process.env.CLASH_DATA_SERVICE_URL || 'http://clash-data-service:3004';

// Helper to normalize player tags
function normalizeTag(tag: string): string {
  let normalized = tag.startsWith('#') ? tag.slice(1) : tag;
  return normalized.toUpperCase();
}

// Validate that player exists via Clash Data Service
async function validatePlayerTag(tag: string): Promise<boolean> {
  try {
    const normalized = normalizeTag(tag);
    const response = await fetch(`${CLASH_DATA_SERVICE_URL}/players/%23${normalized}`);
    return response.ok;
  } catch (error) {
    logger.error('Error validating player tag:', error);
    return false;
  }
}

export async function createLink(req: Request, res: Response) {
  try {
    const { userId, playerTag } = req.body;

    if (!userId || !playerTag) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'userId and playerTag are required',
      });
    }

    const normalized = normalizeTag(playerTag);

    // Validate that player exists
    const isValid = await validatePlayerTag(normalized);
    if (!isValid) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'Player not found in Clash Royale',
      });
    }

    const db = getDatabase();

    // Check if user already has a link
    const existing = db.prepare('SELECT * FROM player_links WHERE user_id = ?').get(userId);
    if (existing) {
      return res.status(409).json({
        error: 'ConflictError',
        message: 'User already has a linked player account',
      });
    }

    // Check if player_tag is already linked to another user
    const tagLinked = db
      .prepare('SELECT * FROM player_links WHERE player_tag = ?')
      .get(`#${normalized}`);
    if (tagLinked) {
      return res.status(409).json({
        error: 'ConflictError',
        message: 'This player tag is already linked to another account',
      });
    }

    // Create link
    const result = db
      .prepare('INSERT INTO player_links (user_id, player_tag) VALUES (?, ?)')
      .run(userId, `#${normalized}`);

    const link = db
      .prepare('SELECT * FROM player_links WHERE id = ?')
      .get(result.lastInsertRowid) as PlayerLink;

    logger.info(`Link created: User ${userId} -> Player ${normalized}`);
    res.status(201).json(link);
  } catch (error) {
    logger.error('Error creating link:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to create link',
    });
  }
}

export async function updateLink(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { twitter, twitch } = req.body;

    const db = getDatabase();

    // Check if link exists
    const existing = db.prepare('SELECT * FROM player_links WHERE user_id = ?').get(userId);
    if (!existing) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'No linked player found for this user',
      });
    }

    // Update link
    // Only update fields that are provided
    let updates = [];
    let params = [];

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

    logger.info(`Link updated for user ${userId}`);
    res.json(link);
  } catch (error) {
    logger.error('Error updating link:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to update link',
    });
  }
}

export async function getLink(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    const db = getDatabase();
    const link = db.prepare('SELECT * FROM player_links WHERE user_id = ?').get(userId) as
      | PlayerLink
      | undefined;

    if (!link) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'No linked player found for this user',
      });
    }

    res.json(link);
  } catch (error) {
    logger.error('Error getting link:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to get link',
    });
  }
}

export async function deleteLink(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    const db = getDatabase();
    const result = db.prepare('DELETE FROM player_links WHERE user_id = ?').run(userId);

    if (result.changes === 0) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'No linked player found for this user',
      });
    }

    logger.info(`Link deleted for user: ${userId}`);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting link:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to delete link',
    });
  }
}

export async function getLinkByTag(req: Request, res: Response) {
  try {
    const { tag } = req.params;
    if (typeof tag !== 'string') {
      return res.status(400).json({ error: 'ValidationError', message: 'Invalid tag' });
    }
    const normalized = normalizeTag(tag); // Removes # and uppercases

    const db = getDatabase();
    // We store tags with # in database
    const link = db.prepare('SELECT * FROM player_links WHERE player_tag = ?').get(`#${normalized}`) as
      | PlayerLink
      | undefined;

    if (!link) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'No link found for this player tag',
      });
    }

    res.json(link);
  } catch (error) {
    logger.error('Error getting link by tag:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to get link by tag',
    });
  }
}

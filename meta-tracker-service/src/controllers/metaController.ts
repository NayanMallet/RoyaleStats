import { Request, Response } from 'express';
import { getDatabase } from '../database';
import { ValidationError, logger } from 'shared';

// Errors are thrown: Express 5 forwards them, sync or async, to the shared error handler.
import { processBattles } from '../services/ingestionService';

export async function getMetaSnapshot(req: Request, res: Response) {
  const db = getDatabase();

  // Get top 10 most used cards
  const topCards = db
    .prepare(
      `
    SELECT 
      card_name,
      usage_count,
      win_count,
      ROUND(CAST(win_count AS FLOAT) / NULLIF(usage_count, 0) * 100, 2) as win_rate
    FROM card_stats
    WHERE usage_count > 0
    ORDER BY usage_count DESC
    LIMIT 10
  `,
    )
    .all();

  // Get total battles count
  const battleCount = db.prepare('SELECT COUNT(*) as count FROM battles').get() as {
    count: number;
  };

  res.json({
    snapshot: {
      totalBattles: battleCount?.count || 0,
      topCards: topCards || [],
      generatedAt: new Date().toISOString(),
    },
  });
}

export async function analyzeDeck(req: Request, res: Response) {
  const { cards } = req.body ?? {};

  if (!Array.isArray(cards) || cards.length !== 8) {
    throw new ValidationError('Un deck doit contenir exactement 8 cartes.');
  }

  const db = getDatabase();

  // Get stats for each card in the deck
  const cardStats = [];
  let totalUsage = 0;
  let totalWinRate = 0;

  const stmt = db.prepare(`
      SELECT 
        card_name,
        usage_count,
        win_count,
        ROUND(CAST(win_count AS FLOAT) / NULLIF(usage_count, 0) * 100, 2) as win_rate
      FROM card_stats
      WHERE card_name = ?
    `);

  for (const cardName of cards) {
    const stats = stmt.get(cardName) as any;

    if (stats) {
      cardStats.push(stats);
      totalUsage += stats.usage_count;
      totalWinRate += stats.win_rate || 0;
    }
  }

  const avgWinRate = cardStats.length > 0 ? totalWinRate / cardStats.length : 50;
  const score = Math.min(100, Math.max(0, avgWinRate));

  res.json({
    deck: cards,
    score: Math.round(score),
    analysis: {
      avgWinRate: avgWinRate.toFixed(2),
      totalUsage: totalUsage,
      cardStats: cardStats,
    },
    recommendations:
      score < 60
        ? [
            'Consider replacing low win-rate cards',
            'Check the meta snapshot for popular alternatives',
          ]
        : ['Your deck looks solid!', 'Consider minor optimizations based on card levels'],
  });
}

export async function getRecommendations(req: Request, res: Response) {
  const { playerTag } = req.params;

  const db = getDatabase();
  const topCards = db
    .prepare(
      `
    SELECT card_name, win_rate
    FROM (
      SELECT 
        card_name,
        ROUND(CAST(win_count AS FLOAT) / NULLIF(usage_count, 0) * 100, 2) as win_rate
      FROM card_stats
      WHERE usage_count > 10
    )
    ORDER BY win_rate DESC
    LIMIT 5
  `,
    )
    .all();

  res.json({
    playerTag: playerTag,
    recommendations: {
      topMetaCards: topCards || [],
      suggestions: [
        'Try incorporating high win-rate cards from the current meta',
        'Balance your elixir cost across your deck',
        'Ensure you have both offensive and defensive options',
      ],
    },
  });
}

export async function ingestBattles(req: Request, res: Response) {
  const { battles } = req.body ?? {};

  if (!Array.isArray(battles)) {
    throw new ValidationError('Le champ battles doit être une liste de combats.');
  }

  const ingested = processBattles(battles);

  logger.info('Battles ingested', { ingested });
  res.json({ ingested });
}

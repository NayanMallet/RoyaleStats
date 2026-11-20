import { Request, Response } from 'express';
import { getDatabase } from '../database';
import { NotFoundError, ValidationError, logger } from 'shared';

// Errors are thrown: Express 5 forwards them, sync or async, to the shared error handler.
import { processBattles } from '../services/ingestionService';
import { formatPlayerTag, normalizeBattleLog } from '../services/battleNormalizer';
import { getFromClashDataService, playerPath } from '../services/clashDataClient';
import {
  analyseDeck,
  type CardDefinition,
  type CardStat,
  type DeckAnalysis,
} from '../services/deckAnalysis';

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

const PLAYER_TAG = /^#[0-9A-Z]{3,15}$/;

/**
 * POST /players/:playerTag/ingest — adds the recent battles of one player to the meta. The
 * battles are fetched from clash-data-service by the server: a client can ask for a player to be
 * ingested, never send battles itself. Calling it again is harmless (duplicates are ignored, and
 * clash-data-service serves the battle log from its cache for 2 minutes).
 */
export async function ingestPlayer(req: Request, res: Response) {
  const playerTag = formatPlayerTag(String(req.params.playerTag ?? ''));
  if (!PLAYER_TAG.test(playerTag)) {
    throw new ValidationError('Tag de joueur invalide : lettres et chiffres après le #.', {
      code: 'InvalidPlayerTag',
    });
  }

  const rawLog = await getFromClashDataService<unknown>(playerPath(playerTag, '/battles'));
  const { battles, skipped } = normalizeBattleLog(playerTag, rawLog);
  const report = processBattles(battles);

  logger.info('Player battles ingested', { playerTag, ...report, skipped });
  // `skipped`: battles of the log that are not readable from the player's side.
  res.json({ playerTag, ...report, skipped });
}

/** The whole sample: card statistics and number of battles. */
function sample(): { stats: CardStat[]; totalBattles: number } {
  const db = getDatabase();
  const stats = db
    .prepare('SELECT card_name, usage_count, win_count FROM card_stats WHERE usage_count > 0')
    .all() as CardStat[];
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM battles').get() as { count: number };
  return { stats, totalBattles: count };
}

async function cardDefinitions(): Promise<CardDefinition[]> {
  const cards = await getFromClashDataService<{ items?: CardDefinition[] }>('/cards');
  return cards.items ?? [];
}

function analyse(deckCards: string[], definitions: CardDefinition[]): DeckAnalysis {
  const { stats, totalBattles } = sample();
  return analyseDeck(deckCards, stats, definitions, totalBattles);
}

/**
 * GET /players/:playerTag/analysis — analyses the deck the player currently uses, fetched from
 * clash-data-service, against the collected meta, with simple alternatives for weak cards.
 */
export async function analysePlayerDeck(req: Request, res: Response) {
  const playerTag = formatPlayerTag(String(req.params.playerTag ?? ''));
  if (!PLAYER_TAG.test(playerTag)) {
    throw new ValidationError('Tag de joueur invalide : lettres et chiffres après le #.', {
      code: 'InvalidPlayerTag',
    });
  }

  const [profile, definitions] = await Promise.all([
    getFromClashDataService<{ currentDeck?: CardDefinition[] }>(playerPath(playerTag)),
    cardDefinitions(),
  ]);
  const deckCards = (profile.currentDeck ?? [])
    .map((card) => card.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0);
  if (deckCards.length === 0) {
    throw new NotFoundError('Ce joueur n’a pas encore de deck actuel.', { code: 'DeckNotFound' });
  }

  res.json({ playerTag, ...analyse(deckCards, definitions) });
}

/** POST /analyze/deck — the same analysis for any list of 8 card names. */
export async function analyzeDeck(req: Request, res: Response) {
  const { cards } = req.body ?? {};
  const names = Array.isArray(cards) ? cards.filter((card) => typeof card === 'string') : [];
  if (!Array.isArray(cards) || names.length !== 8 || new Set(names).size !== 8) {
    throw new ValidationError('Un deck doit contenir exactement 8 cartes différentes.');
  }

  res.json(analyse(names, await cardDefinitions()));
}

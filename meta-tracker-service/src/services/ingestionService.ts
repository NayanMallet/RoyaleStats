import { getDatabase } from '../database';
import { logger } from 'shared';

const RESULTS = new Set(['win', 'loss', 'draw']);
const MAX_DECK_SIZE = 8;

/** A battle in the internal format, once checked. */
export interface IngestedBattle {
  playerTag: string;
  battleTime: string;
  /** Distinct card names of the observed player's deck. */
  deckCards: string[];
  opponentDeck: string[];
  result: 'win' | 'loss' | 'draw';
  trophies: number | null;
}

export interface IngestionReport {
  /** New battles stored and counted in the card statistics. */
  ingested: number;
  /** Battles already stored (same player and time): ignored, so re-sending is harmless. */
  duplicates: number;
  /** Battles that do not follow the internal format: ignored, nothing is stored. */
  invalid: number;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function cardNames(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every(isNonEmptyString)) return null;
  // A card counts once per battle, even if the source lists it twice.
  return [...new Set(value.map((name) => name.trim()))];
}

/**
 * Checks a battle sent by the worker or by a client. A battle without player, time, known result
 * or deck would distort the statistics (or escape the duplicate check, NULL never being equal to
 * NULL in SQL), so it is refused as a whole.
 */
export function parseBattle(raw: unknown): IngestedBattle | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const battle = raw as Record<string, unknown>;

  const deckCards = cardNames(battle.deckCards);
  const opponentDeck = battle.opponentDeck === undefined ? [] : cardNames(battle.opponentDeck);
  if (
    !isNonEmptyString(battle.playerTag) ||
    !isNonEmptyString(battle.battleTime) ||
    typeof battle.result !== 'string' ||
    !RESULTS.has(battle.result) ||
    !deckCards ||
    deckCards.length === 0 ||
    deckCards.length > MAX_DECK_SIZE ||
    !opponentDeck
  ) {
    return null;
  }

  return {
    playerTag: battle.playerTag.trim(),
    battleTime: battle.battleTime.trim(),
    deckCards,
    opponentDeck,
    result: battle.result as IngestedBattle['result'],
    trophies: typeof battle.trophies === 'number' ? battle.trophies : null,
  };
}

/**
 * Stores new battles and adds their decks to the card statistics. A battle is identified by its
 * player and its time: sending the same observations again changes nothing. The whole batch is
 * written in one transaction, so a battle is never stored without its statistics.
 */
export function processBattles(rawBattles: unknown[]): IngestionReport {
  const db = getDatabase();
  const report: IngestionReport = { ingested: 0, duplicates: 0, invalid: 0 };

  const battleExists = db.prepare('SELECT 1 FROM battles WHERE player_tag = ? AND battle_time = ?');
  const insertBattle = db.prepare(`
    INSERT INTO battles (player_tag, battle_time, deck_cards, opponent_deck, result, trophies)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const updateCardStats = db.prepare(`
    INSERT INTO card_stats (card_name, usage_count, win_count)
    VALUES (?, 1, ?)
    ON CONFLICT(card_name) DO UPDATE SET
      usage_count = usage_count + 1,
      win_count = win_count + excluded.win_count,
      updated_at = CURRENT_TIMESTAMP
  `);

  db.transaction(() => {
    for (const raw of rawBattles) {
      const battle = parseBattle(raw);
      if (!battle) {
        report.invalid++;
        continue;
      }
      if (battleExists.get(battle.playerTag, battle.battleTime)) {
        report.duplicates++;
        continue;
      }

      insertBattle.run(
        battle.playerTag,
        battle.battleTime,
        JSON.stringify(battle.deckCards),
        JSON.stringify(battle.opponentDeck),
        battle.result,
        battle.trophies,
      );
      const isWin = battle.result === 'win' ? 1 : 0;
      for (const card of battle.deckCards) {
        updateCardStats.run(card, isWin);
      }
      report.ingested++;
    }
  })();

  if (report.invalid > 0) {
    logger.warn('Invalid battles ignored', { invalid: report.invalid });
  }
  return report;
}

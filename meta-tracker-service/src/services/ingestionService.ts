import { getDatabase } from '../database';
import { logger } from 'shared';

export function processBattles(battles: any[]) {
  const db = getDatabase();
  let ingested = 0;

  const insertBattle =
    db.prepare(`INSERT INTO battles (player_tag, battle_time, deck_cards, opponent_deck, result, trophies)
         VALUES (?, ?, ?, ?, ?, ?)`);

  const updateCardStats = db.prepare(`
            INSERT INTO card_stats (card_name, usage_count, win_count)
            VALUES (?, 1, ?)
            ON CONFLICT(card_name) DO UPDATE SET
              usage_count = usage_count + 1,
              win_count = win_count + ?,
              updated_at = CURRENT_TIMESTAMP
          `);

  for (const battle of battles) {
    try {
      const { playerTag, battleTime, deckCards, opponentDeck, result, trophies } = battle;

      // Basic deduplication check (optional but good practice)
      // Ideally we check if battle exists by playerTag + battleTime
      const battleExists = db
        .prepare('SELECT 1 FROM battles WHERE player_tag = ? AND battle_time = ?')
        .get(playerTag, battleTime);

      if (battleExists) {
        continue;
      }

      // Insert battle
      insertBattle.run(
        playerTag,
        battleTime,
        JSON.stringify(deckCards),
        JSON.stringify(opponentDeck),
        result,
        trophies,
      );

      // Update card statistics
      if (Array.isArray(deckCards)) {
        for (const card of deckCards) {
          const isWin = result === 'win' ? 1 : 0;
          updateCardStats.run(card, isWin, isWin);
        }
      }

      ingested++;
    } catch (e) {
      logger.warn('Failed to insert individual battle', e);
    }
  }

  return ingested;
}

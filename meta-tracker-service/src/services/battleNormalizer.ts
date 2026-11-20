// Turns a battle log of the Clash Royale API (as served by clash-data-service) into battles in
// the internal format, seen from the requested player. Used by the hourly worker and by the
// on-demand ingestion of one player: the clients never send battles themselves.

import { formatPlayerTag, readBattleForPlayer, type RawParticipant } from 'shared';
import type { IngestedBattle } from './ingestionService';

export { formatPlayerTag };

export interface NormalizedLog {
  battles: IngestedBattle[];
  /** Battles of the log that could not be read from the player's side (format, perspective). */
  skipped: number;
}

function cardNames(participant: RawParticipant | undefined): string[] {
  return (participant?.cards ?? [])
    .map((card) => card?.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0);
}

/**
 * Each battle is read from the requested player's side (shared readBattleForPlayer): the deck,
 * the result and the trophies are always theirs. A battle where the player does not appear, or
 * without time, crowns or cards, is skipped rather than guessed.
 */
export function normalizeBattleLog(playerTag: string, rawLog: unknown): NormalizedLog {
  const tag = formatPlayerTag(playerTag);
  const log = Array.isArray(rawLog) ? rawLog : [];
  const battles: IngestedBattle[] = [];
  let skipped = 0;

  for (const raw of log) {
    const battle = readBattleForPlayer(raw, tag);
    const deckCards = cardNames(battle?.player);
    if (!battle || deckCards.length === 0) {
      skipped++;
      continue;
    }

    battles.push({
      playerTag: tag,
      battleTime: battle.battleTime,
      deckCards,
      opponentDeck: cardNames(battle.opponent),
      result: battle.result,
      trophies:
        typeof battle.player.startingTrophies === 'number' ? battle.player.startingTrophies : null,
    });
  }

  return { battles, skipped };
}

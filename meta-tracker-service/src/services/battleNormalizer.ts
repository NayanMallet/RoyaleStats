// Turns a battle log of the Clash Royale API (as served by clash-data-service) into battles in
// the internal format, seen from the requested player. Used by the hourly worker and by the
// on-demand ingestion of one player: the clients never send battles themselves.

import type { IngestedBattle } from './ingestionService';

interface RawCard {
  name?: unknown;
}

interface RawParticipant {
  tag?: unknown;
  crowns?: unknown;
  startingTrophies?: unknown;
  cards?: RawCard[];
}

interface RawBattle {
  battleTime?: unknown;
  team?: RawParticipant[];
  opponent?: RawParticipant[];
}

export interface NormalizedLog {
  battles: IngestedBattle[];
  /** Battles of the log that could not be read from the player's side (format, perspective). */
  skipped: number;
}

/** "#2pp8vj9q" or "2PP8VJ9Q" → "#2PP8VJ9Q". */
export function formatPlayerTag(tag: string): string {
  return `#${tag.trim().replace(/^#+/, '').toUpperCase()}`;
}

function cardNames(participant: RawParticipant | undefined): string[] {
  return (participant?.cards ?? [])
    .map((card) => card?.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0);
}

function crowns(side: RawParticipant[] | undefined): number | null {
  const value = side?.[0]?.crowns;
  return typeof value === 'number' ? value : null;
}

/**
 * The player is looked for in `team`, then in `opponent`: the result, the deck and the trophies
 * are always those of the requested player. A battle where the player does not appear, or
 * without crowns or cards, is skipped rather than guessed.
 */
export function normalizeBattleLog(playerTag: string, rawLog: unknown): NormalizedLog {
  const tag = formatPlayerTag(playerTag);
  const log = Array.isArray(rawLog) ? (rawLog as RawBattle[]) : [];
  const battles: IngestedBattle[] = [];
  let skipped = 0;

  for (const raw of log) {
    const inTeam = raw?.team?.find((participant) => participant?.tag === tag);
    const inOpponent = inTeam ? undefined : raw?.opponent?.find((p) => p?.tag === tag);
    const player = inTeam ?? inOpponent;
    const ownSide = inTeam ? raw.team : raw?.opponent;
    const otherSide = inTeam ? raw.opponent : raw?.team;

    const ownCrowns = crowns(ownSide);
    const otherCrowns = crowns(otherSide);
    const deckCards = cardNames(player);

    if (
      !player ||
      typeof raw.battleTime !== 'string' ||
      ownCrowns === null ||
      otherCrowns === null ||
      deckCards.length === 0
    ) {
      skipped++;
      continue;
    }

    battles.push({
      playerTag: tag,
      battleTime: raw.battleTime,
      deckCards,
      opponentDeck: cardNames(otherSide?.[0]),
      result: ownCrowns > otherCrowns ? 'win' : ownCrowns < otherCrowns ? 'loss' : 'draw',
      trophies: typeof player.startingTrophies === 'number' ? player.startingTrophies : null,
    });
  }

  return { battles, skipped };
}

// Reading a Clash Royale API battle from the side of one player. The API lists the requested
// player in `team` most of the time, but not always: the player is looked for on both sides, so
// the result, the deck and the trophies are always theirs. Used by clash-data-service (recent
// form) and meta-tracker-service (meta ingestion).

export interface RawCard {
  name?: unknown;
}

export interface RawParticipant {
  tag?: unknown;
  crowns?: unknown;
  startingTrophies?: unknown;
  trophyChange?: unknown;
  cards?: RawCard[];
}

export interface RawBattle {
  type?: unknown;
  battleTime?: unknown;
  team?: RawParticipant[];
  opponent?: RawParticipant[];
}

export type BattleResult = 'win' | 'loss' | 'draw';

export interface PlayerBattle {
  battleTime: string;
  result: BattleResult;
  player: RawParticipant;
  /** First participant of the other side (the opponent in 1v1). */
  opponent: RawParticipant | undefined;
}

/** "#2pp8vj9q", " 2PP8VJ9Q" or "##2PP8VJ9Q" → "#2PP8VJ9Q". */
export function formatPlayerTag(tag: string): string {
  return `#${tag.trim().replace(/^#+/, '').toUpperCase()}`;
}

function crownsOf(side: RawParticipant[] | undefined): number | null {
  const value = side?.[0]?.crowns;
  return typeof value === 'number' ? value : null;
}

/**
 * The battle seen by `playerTag`, or null when the player does not appear in it or when it has
 * no time or no crowns: such a battle is skipped rather than guessed.
 */
export function readBattleForPlayer(raw: unknown, playerTag: string): PlayerBattle | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const battle = raw as RawBattle;
  const tag = formatPlayerTag(playerTag);

  const inTeam = battle.team?.find((participant) => participant?.tag === tag);
  const inOpponent = inTeam ? undefined : battle.opponent?.find((p) => p?.tag === tag);
  const player = inTeam ?? inOpponent;
  const ownSide = inTeam ? battle.team : battle.opponent;
  const otherSide = inTeam ? battle.opponent : battle.team;

  const ownCrowns = crownsOf(ownSide);
  const otherCrowns = crownsOf(otherSide);
  if (
    !player ||
    typeof battle.battleTime !== 'string' ||
    ownCrowns === null ||
    otherCrowns === null
  ) {
    return null;
  }

  return {
    battleTime: battle.battleTime,
    result: ownCrowns > otherCrowns ? 'win' : ownCrowns < otherCrowns ? 'loss' : 'draw',
    player,
    opponent: otherSide?.[0],
  };
}

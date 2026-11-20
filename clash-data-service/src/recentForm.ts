// Recent form of a player, computed from their battle log (the last ~30 battles kept by the
// Clash Royale API). Pure function: the controller gives the raw log, so the rules can be tested
// in isolation.
//
// Rules, kept simple and explainable to the player:
// - each battle is read from the player's side (shared readBattleForPlayer); a battle that cannot
//   be read (player absent, no time, no crowns) is left out of the sample rather than guessed;
// - the win rate is wins / sample size: a draw counts as a battle not won;
// - under MIN_BATTLES usable battles, the win rate is null and `insufficientData` is true, so the
//   client shows "not enough battles" instead of a misleading 0 % or 100 %;
// - the current streak counts the most recent battles with the same result; a draw ends it;
// - the trophy change only adds the battles where the API gives one (ladder, Path of Legend
//   battles do not always have it), and says on how many battles it was measured.

import { readBattleForPlayer, type PlayerBattle } from 'shared';

export const MIN_BATTLES = 5;

export interface RecentForm {
  /** Usable battles in the log: the base of every indicator ("over N battles"). */
  sampleSize: number;
  minBattles: number;
  insufficientData: boolean;
  wins: number;
  losses: number;
  draws: number;
  /** Percentage with 2 decimals, null under MIN_BATTLES usable battles. */
  winRate: number | null;
  /** Current streak, from the most recent battle; null when it is a draw or there is none. */
  streak: { result: 'win' | 'loss'; count: number } | null;
  /** Sum of the trophy changes the API gives; null when no battle of the sample has one. */
  trophyChange: { total: number; battles: number } | null;
  /** Battle times (API format) of the oldest and the most recent battle of the sample. */
  period: { from: string; to: string } | null;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

function currentStreak(battles: PlayerBattle[]): RecentForm['streak'] {
  const latest = battles[0]?.result;
  if (latest === undefined || latest === 'draw') return null;
  let count = 0;
  while (count < battles.length && battles[count].result === latest) count++;
  return { result: latest, count };
}

export function summarizeRecentForm(playerTag: string, rawLog: unknown): RecentForm {
  const log = Array.isArray(rawLog) ? rawLog : [];
  const battles = log
    .map((raw) => readBattleForPlayer(raw, playerTag))
    .filter((battle): battle is PlayerBattle => battle !== null)
    // Most recent first. The API battle times ("20261119T120000.000Z") sort as strings.
    .sort((a, b) => b.battleTime.localeCompare(a.battleTime));

  const count = (result: PlayerBattle['result']) =>
    battles.filter((battle) => battle.result === result).length;
  const wins = count('win');
  const sampleSize = battles.length;
  const insufficientData = sampleSize < MIN_BATTLES;

  const trophyChanges = battles
    .map((battle) => battle.player.trophyChange)
    .filter((change): change is number => typeof change === 'number');

  return {
    sampleSize,
    minBattles: MIN_BATTLES,
    insufficientData,
    wins,
    losses: count('loss'),
    draws: count('draw'),
    winRate: insufficientData ? null : round2((wins / sampleSize) * 100),
    streak: currentStreak(battles),
    trophyChange:
      trophyChanges.length > 0
        ? {
            total: trophyChanges.reduce((sum, change) => sum + change, 0),
            battles: trophyChanges.length,
          }
        : null,
    period:
      sampleSize > 0
        ? { from: battles[sampleSize - 1].battleTime, to: battles[0].battleTime }
        : null,
  };
}

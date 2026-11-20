// Trophy goal and achievements of a linked player. Pure functions: the controller gives the
// profile and the battle log read from clash-data-service, the snapshot kept from the previous
// evaluation and the current time, so the rules can be tested in isolation.
//
// Rules, kept simple and explainable to the player:
// - "linked" is unlocked when the account is linked (and given by migration 2 to the links that
//   already existed, dated from their linking);
// - win streaks (5, 10) and the 3-crown win are read in the battle log, in chronological order
//   from the player's side: a draw or a loss ends a streak. They are dated from the battle that
//   unlocked them;
// - "goal-reached" is unlocked once the trophies reach the goal, once per goal value;
// - "new-arena" compares the profile with the snapshot of the previous evaluation: another arena
//   with more trophies than then. The first evaluation only records the snapshot;
// - once unlocked, an achievement is stored with its date and never lost, even when the battles
//   that unlocked it have left the battle log (the API only keeps about 30).

import { readBattleForPlayer, type PlayerBattle } from 'shared';

export const WIN_STREAKS = [5, 10] as const;
/** Upper bound of a trophy goal: well above the best trophy count ever reached. */
export const MAX_TROPHY_GOAL = 20000;

export type AchievementCode =
  | 'linked'
  | 'win-streak-5'
  | 'win-streak-10'
  | 'three-crowns'
  | 'goal-reached'
  | 'new-arena';

export interface UnlockedAchievement {
  code: AchievementCode;
  /** Goal value or arena name for the achievements that can be unlocked several times, else ''. */
  detail: string;
  /** ISO 8601 date. */
  unlockedAt: string;
}

export interface Snapshot {
  trophies: number | null;
  arenaId: number | null;
}

export interface EvaluationInput {
  playerTag: string;
  profile: unknown;
  battleLog: unknown;
  trophyGoal: number | null;
  snapshot: Snapshot;
  /** ISO 8601 date of the evaluation. */
  now: string;
}

export interface Evaluation {
  unlocked: UnlockedAchievement[];
  /** Snapshot to keep for the next evaluation. */
  snapshot: Snapshot;
}

interface Profile {
  trophies?: unknown;
  arena?: { id?: unknown; name?: unknown };
}

const CATALOG: Record<AchievementCode, { title: string; description: (detail: string) => string }> =
  {
    linked: {
      title: 'Compte lié',
      description: () => 'Ton compte Clash Royale est lié à RoyaleStats.',
    },
    'win-streak-5': { title: 'En feu', description: () => '5 victoires d’affilée.' },
    'win-streak-10': { title: 'Inarrêtable', description: () => '10 victoires d’affilée.' },
    'three-crowns': { title: 'Triple couronne', description: () => 'Une victoire 3 couronnes.' },
    'goal-reached': {
      title: 'Objectif atteint',
      description: (detail) => `Objectif de ${detail} trophées atteint.`,
    },
    'new-arena': { title: 'Nouvelle arène', description: (detail) => `${detail} atteinte.` },
  };

/** Achievements shown as "still to unlock": the ones that do not depend on a goal or an arena. */
export const LOCKABLE: AchievementCode[] = ['win-streak-5', 'win-streak-10', 'three-crowns'];

export function describeAchievement(code: AchievementCode, detail = '') {
  const entry = CATALOG[code];
  return { code, title: entry.title, description: entry.description(detail), detail };
}

export function isAchievementCode(code: string): code is AchievementCode {
  return code in CATALOG;
}

/** "20261119T120000.000Z" (Clash Royale API) → "2026-11-19T12:00:00.000Z"; null otherwise. */
export function battleTimeToIso(battleTime: string): string | null {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(\.\d{3})?Z$/.exec(battleTime);
  if (!match) return null;
  const [, year, month, day, hours, minutes, seconds, millis = '.000'] = match;
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${millis}Z`;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function battleAchievements(playerTag: string, battleLog: unknown): UnlockedAchievement[] {
  const battles = (Array.isArray(battleLog) ? battleLog : [])
    .map((raw) => readBattleForPlayer(raw, playerTag))
    .filter((battle): battle is PlayerBattle => battle !== null)
    .sort((a, b) => a.battleTime.localeCompare(b.battleTime));

  const unlocked = new Map<AchievementCode, UnlockedAchievement>();
  const unlock = (code: AchievementCode, battle: PlayerBattle) => {
    const unlockedAt = battleTimeToIso(battle.battleTime);
    if (unlockedAt && !unlocked.has(code)) unlocked.set(code, { code, detail: '', unlockedAt });
  };

  let streak = 0;
  for (const battle of battles) {
    streak = battle.result === 'win' ? streak + 1 : 0;
    for (const length of WIN_STREAKS) {
      if (streak === length) unlock(`win-streak-${length}`, battle);
    }
    if (battle.result === 'win' && battle.player.crowns === 3) unlock('three-crowns', battle);
  }
  return [...unlocked.values()];
}

export function evaluateAchievements(input: EvaluationInput): Evaluation {
  const profile = (
    typeof input.profile === 'object' && input.profile !== null ? input.profile : {}
  ) as Profile;
  const trophies = numberOrNull(profile.trophies);
  const arenaId = numberOrNull(profile.arena?.id);
  const arenaName = typeof profile.arena?.name === 'string' ? profile.arena.name : null;

  const unlocked = battleAchievements(input.playerTag, input.battleLog);

  if (input.trophyGoal !== null && trophies !== null && trophies >= input.trophyGoal) {
    unlocked.push({
      code: 'goal-reached',
      detail: String(input.trophyGoal),
      unlockedAt: input.now,
    });
  }

  const previous = input.snapshot;
  if (
    arenaId !== null &&
    arenaName !== null &&
    previous.arenaId !== null &&
    arenaId !== previous.arenaId &&
    trophies !== null &&
    previous.trophies !== null &&
    trophies > previous.trophies
  ) {
    unlocked.push({ code: 'new-arena', detail: arenaName, unlockedAt: input.now });
  }

  return {
    unlocked,
    snapshot: { trophies: trophies ?? previous.trophies, arenaId: arenaId ?? previous.arenaId },
  };
}

/** Progress towards the goal, in % with 1 decimal and capped at 100; null without a goal. */
export function goalProgress(trophyGoal: number | null, trophies: number | null) {
  if (trophyGoal === null) return null;
  return {
    trophyGoal,
    trophies,
    progress:
      trophies === null ? null : Math.min(100, Math.round((trophies / trophyGoal) * 1000) / 10),
    reached: trophies === null ? null : trophies >= trophyGoal,
  };
}

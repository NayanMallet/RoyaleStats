import { describe, expect, it } from 'vitest';
import {
  battleTimeToIso,
  describeAchievement,
  evaluateAchievements,
  goalProgress,
  type EvaluationInput,
} from './achievements';

type Result = 'win' | 'loss' | 'draw';

const CROWNS: Record<Result, [number, number]> = { win: [1, 0], loss: [0, 1], draw: [1, 1] };

/** Battle of #P at minute `minute` (2026-11-19 12:mm), #P in `team` unless `asOpponent`. */
function battle(
  result: Result,
  minute: number,
  options: { crowns?: number; asOpponent?: boolean } = {},
) {
  const [own, other] = CROWNS[result];
  const player = { tag: '#P', crowns: options.crowns ?? own };
  const opponent = { tag: '#X', crowns: other };
  return {
    battleTime: `20261119T12${String(minute).padStart(2, '0')}00.000Z`,
    team: [options.asOpponent ? opponent : player],
    opponent: [options.asOpponent ? player : opponent],
  };
}

/** Log in API order (most recent first) from results listed oldest first. */
const logOf = (...results: Result[]) =>
  results.map((result, minute) => battle(result, minute)).reverse();

const NOW = '2026-11-20T08:00:00.000Z';

function evaluate(input: Partial<EvaluationInput>) {
  return evaluateAchievements({
    playerTag: '#P',
    profile: { trophies: 5000, arena: { id: 10, name: 'Arène 10' } },
    battleLog: [],
    trophyGoal: null,
    snapshot: { trophies: 5000, arenaId: 10 },
    now: NOW,
    ...input,
  });
}

const codes = (input: Partial<EvaluationInput>) =>
  evaluate(input).unlocked.map((achievement) => achievement.code);

describe('battleTimeToIso', () => {
  it('turns a Clash Royale battle time into an ISO date', () => {
    expect(battleTimeToIso('20261119T120500.000Z')).toBe('2026-11-19T12:05:00.000Z');
    expect(battleTimeToIso('20261119T120500Z')).toBe('2026-11-19T12:05:00.000Z');
  });

  it('answers null for another format', () => {
    expect(battleTimeToIso('2026-11-19')).toBeNull();
  });
});

describe('win streaks', () => {
  it('unlocks "En feu" at the 5th win in a row, dated from that battle', () => {
    const { unlocked } = evaluate({
      battleLog: logOf('loss', 'win', 'win', 'win', 'win', 'win', 'win'),
    });

    expect(unlocked).toEqual([
      { code: 'win-streak-5', detail: '', unlockedAt: '2026-11-19T12:05:00.000Z' },
    ]);
  });

  it('unlocks both streaks after 10 wins in a row', () => {
    expect(codes({ battleLog: logOf(...Array<Result>(10).fill('win')) })).toEqual([
      'win-streak-5',
      'win-streak-10',
    ]);
  });

  it.each<Result>(['loss', 'draw'])('does not count a streak broken by a %s', (breaker) => {
    expect(codes({ battleLog: logOf('win', 'win', 'win', breaker, 'win', 'win') })).toEqual([]);
  });

  it('follows the battle times, not the order of the log', () => {
    const shuffled = [3, 0, 4, 1, 2].map((minute) => battle('win', minute));

    expect(evaluate({ battleLog: shuffled }).unlocked).toEqual([
      { code: 'win-streak-5', detail: '', unlockedAt: '2026-11-19T12:04:00.000Z' },
    ]);
  });

  it('reads the player from their side when the API lists them in opponent', () => {
    const log = [0, 1, 2, 3, 4].map((minute) => battle('win', minute, { asOpponent: true }));

    expect(codes({ battleLog: log })).toEqual(['win-streak-5']);
  });
});

describe('three crowns', () => {
  it('unlocks "Triple couronne" at the first 3-crown win', () => {
    const { unlocked } = evaluate({
      battleLog: [battle('win', 2, { crowns: 3 }), battle('win', 1, { crowns: 3 })],
    });

    expect(unlocked).toEqual([
      { code: 'three-crowns', detail: '', unlockedAt: '2026-11-19T12:01:00.000Z' },
    ]);
  });

  it('ignores a battle with 3 crowns that is not a win', () => {
    const lost = {
      battleTime: '20261119T120000.000Z',
      team: [{ tag: '#P', crowns: 3 }],
      opponent: [{ tag: '#X', crowns: 3 }],
    };

    expect(codes({ battleLog: [lost] })).toEqual([]);
  });
});

describe('trophy goal', () => {
  it('unlocks "Objectif atteint" for the goal value once the trophies reach it', () => {
    expect(evaluate({ trophyGoal: 5000 }).unlocked).toEqual([
      { code: 'goal-reached', detail: '5000', unlockedAt: NOW },
    ]);
  });

  it('does not unlock it below the goal or without a goal', () => {
    expect(codes({ trophyGoal: 5001 })).toEqual([]);
    expect(codes({ trophyGoal: null })).toEqual([]);
  });

  it('computes the progress, capped at 100 %', () => {
    expect(goalProgress(6000, 4500)).toEqual({
      trophyGoal: 6000,
      trophies: 4500,
      progress: 75,
      reached: false,
    });
    expect(goalProgress(3000, 4500)).toMatchObject({ progress: 100, reached: true });
    expect(goalProgress(7000, 4567)?.progress).toBe(65.2);
  });

  it('has no progress without a goal, and unknown progress without the trophies', () => {
    expect(goalProgress(null, 4500)).toBeNull();
    expect(goalProgress(6000, null)).toEqual({
      trophyGoal: 6000,
      trophies: null,
      progress: null,
      reached: null,
    });
  });
});

describe('new arena', () => {
  it('unlocks "Nouvelle arène" when the arena changed with more trophies than the snapshot', () => {
    const { unlocked, snapshot } = evaluate({
      profile: { trophies: 5400, arena: { id: 11, name: 'Arène 11' } },
      snapshot: { trophies: 4900, arenaId: 10 },
    });

    expect(unlocked).toEqual([{ code: 'new-arena', detail: 'Arène 11', unlockedAt: NOW }]);
    expect(snapshot).toEqual({ trophies: 5400, arenaId: 11 });
  });

  it('does not unlock it when the player went down to another arena', () => {
    expect(
      codes({
        profile: { trophies: 4500, arena: { id: 9, name: 'Arène 9' } },
        snapshot: { trophies: 4900, arenaId: 10 },
      }),
    ).toEqual([]);
  });

  it('only records the snapshot at the first evaluation', () => {
    const { unlocked, snapshot } = evaluate({ snapshot: { trophies: null, arenaId: null } });

    expect(unlocked).toEqual([]);
    expect(snapshot).toEqual({ trophies: 5000, arenaId: 10 });
  });

  it('keeps the previous snapshot when the profile has no trophies or arena', () => {
    const { snapshot } = evaluate({ profile: {}, snapshot: { trophies: 4900, arenaId: 10 } });

    expect(snapshot).toEqual({ trophies: 4900, arenaId: 10 });
  });
});

describe('describeAchievement', () => {
  it('gives the title and the description shown to the player', () => {
    expect(describeAchievement('win-streak-5')).toEqual({
      code: 'win-streak-5',
      title: 'En feu',
      description: '5 victoires d’affilée.',
      detail: '',
    });
    expect(describeAchievement('goal-reached', '7000').description).toBe(
      'Objectif de 7000 trophées atteint.',
    );
  });
});

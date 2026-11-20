import { describe, expect, it } from 'vitest';
import { MIN_BATTLES, summarizeRecentForm } from './recentForm';

type Result = 'win' | 'loss' | 'draw';

const CROWNS: Record<Result, [number, number]> = { win: [3, 1], loss: [0, 2], draw: [1, 1] };

/** Battle of #P at minute `minute`, #P in `team` unless `asOpponent`. */
function battle(
  result: Result,
  minute: number,
  extra: { trophyChange?: number; asOpponent?: boolean } = {},
) {
  const [own, other] = CROWNS[result];
  const player = { tag: '#P', crowns: own, trophyChange: extra.trophyChange };
  const opponent = { tag: '#X', crowns: other };
  return {
    battleTime: `20261119T12${String(minute).padStart(2, '0')}00.000Z`,
    team: [extra.asOpponent ? opponent : player],
    opponent: [extra.asOpponent ? player : opponent],
  };
}

/** Log in API order (most recent first) from results listed oldest first. */
const logOf = (...results: Result[]) =>
  results.map((result, minute) => battle(result, minute)).reverse();

describe('summarizeRecentForm', () => {
  it('counts the results and computes the win rate over the usable battles', () => {
    const form = summarizeRecentForm('#P', logOf('win', 'loss', 'win', 'draw', 'win', 'loss'));

    expect(form).toMatchObject({
      sampleSize: 6,
      minBattles: MIN_BATTLES,
      insufficientData: false,
      wins: 3,
      losses: 2,
      draws: 1,
      winRate: 50,
    });
  });

  it('rounds the win rate to 2 decimals', () => {
    expect(
      summarizeRecentForm('#P', logOf('win', 'loss', 'loss', 'win', 'loss', 'loss')).winRate,
    ).toBe(33.33);
  });

  it('reads the player from their side when the API lists them in opponent', () => {
    const log = [0, 1, 2, 3, 4].map((minute) => battle('win', minute, { asOpponent: true }));

    expect(summarizeRecentForm('p', log)).toMatchObject({ wins: 5, losses: 0, winRate: 100 });
  });

  describe('insufficient data', () => {
    it(`flags a sample under ${MIN_BATTLES} battles and gives no win rate`, () => {
      const form = summarizeRecentForm('#P', logOf('loss', 'loss', 'loss', 'loss'));

      expect(form).toMatchObject({
        sampleSize: 4,
        insufficientData: true,
        losses: 4,
        winRate: null,
      });
    });

    it('answers an empty log with an empty sample, not with an error', () => {
      expect(summarizeRecentForm('#P', [])).toEqual({
        sampleSize: 0,
        minBattles: MIN_BATTLES,
        insufficientData: true,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: null,
        streak: null,
        trophyChange: null,
        period: null,
      });
    });

    it('treats a log that is not an array as empty', () => {
      expect(summarizeRecentForm('#P', { items: [] }).sampleSize).toBe(0);
    });

    it('leaves out the battles it cannot read, so they do not count in the sample', () => {
      const log = [
        ...logOf('win', 'win', 'win', 'win'),
        { battleTime: '20261119T110000.000Z', team: [{ tag: '#OTHER', crowns: 1 }], opponent: [] },
        { team: [{ tag: '#P', crowns: 3 }], opponent: [{ tag: '#X', crowns: 0 }] },
        null,
      ];

      expect(summarizeRecentForm('#P', log)).toMatchObject({
        sampleSize: 4,
        insufficientData: true,
        winRate: null,
      });
    });
  });

  describe('streak', () => {
    it('counts the most recent battles with the same result', () => {
      expect(
        summarizeRecentForm('#P', logOf('loss', 'win', 'loss', 'loss', 'loss')).streak,
      ).toEqual({ result: 'loss', count: 3 });
    });

    it('does not depend on the order of the log', () => {
      const shuffled = [battle('win', 3), battle('loss', 1), battle('win', 4), battle('win', 2)];

      expect(summarizeRecentForm('#P', shuffled).streak).toEqual({ result: 'win', count: 3 });
    });

    it('has no streak when the most recent battle is a draw', () => {
      expect(summarizeRecentForm('#P', logOf('win', 'win', 'draw')).streak).toBeNull();
    });

    it('stops at a draw', () => {
      expect(summarizeRecentForm('#P', logOf('win', 'draw', 'win', 'win')).streak).toEqual({
        result: 'win',
        count: 2,
      });
    });
  });

  it('adds the trophy changes the API gives and says over how many battles', () => {
    const log = [
      battle('win', 3, { trophyChange: 30 }),
      battle('loss', 2, { trophyChange: -28 }),
      battle('win', 1),
      battle('win', 0, { trophyChange: 31 }),
    ];

    expect(summarizeRecentForm('#P', log).trophyChange).toEqual({ total: 33, battles: 3 });
  });

  it('has no trophy change when no battle gives one', () => {
    expect(summarizeRecentForm('#P', logOf('win', 'win')).trophyChange).toBeNull();
  });

  it('gives the period covered by the sample', () => {
    expect(summarizeRecentForm('#P', logOf('win', 'loss', 'win')).period).toEqual({
      from: '20261119T120000.000Z',
      to: '20261119T120200.000Z',
    });
  });
});

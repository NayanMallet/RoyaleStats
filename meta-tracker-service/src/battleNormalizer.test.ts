import { describe, expect, it } from 'vitest';
import { formatPlayerTag, normalizeBattleLog } from './services/battleNormalizer';

const DECK = ['Hog Rider', 'Musketeer'];
const side = (tag: string, crowns: number, cards = DECK) => [
  { tag, crowns, startingTrophies: 6000, cards: cards.map((name) => ({ name })) },
];

describe('formatPlayerTag', () => {
  it.each([' 2pp8vj9q', '#2PP8VJ9Q', '##2pp8vj9q'])('formats %j as #2PP8VJ9Q', (tag) => {
    expect(formatPlayerTag(tag)).toBe('#2PP8VJ9Q');
  });
});

describe('normalizeBattleLog', () => {
  it('reads the result from the player side, in team or in opponent', () => {
    const { battles, skipped } = normalizeBattleLog('2pp8vj9q', [
      { battleTime: 't1', team: side('#2PP8VJ9Q', 3), opponent: side('#X', 1, ['Knight']) },
      { battleTime: 't2', team: side('#X', 3, ['Knight']), opponent: side('#2PP8VJ9Q', 1) },
      { battleTime: 't3', team: side('#2PP8VJ9Q', 1), opponent: side('#X', 1) },
    ]);

    expect(skipped).toBe(0);
    expect(battles.map((b) => [b.battleTime, b.result])).toEqual([
      ['t1', 'win'],
      ['t2', 'loss'],
      ['t3', 'draw'],
    ]);
    expect(battles[1]).toMatchObject({
      playerTag: '#2PP8VJ9Q',
      deckCards: DECK,
      opponentDeck: ['Knight'],
    });
  });

  it('skips battles where the player does not appear or that cannot be read', () => {
    const { battles, skipped } = normalizeBattleLog('#2PP8VJ9Q', [
      { battleTime: 't1', team: side('#SOMEONE', 3), opponent: side('#ELSE', 1) },
      { battleTime: 't2', team: side('#2PP8VJ9Q', 3) },
      { team: side('#2PP8VJ9Q', 3), opponent: side('#X', 1) },
      { battleTime: 't4', team: side('#2PP8VJ9Q', 3, []), opponent: side('#X', 1) },
      null,
    ]);

    expect(battles).toEqual([]);
    expect(skipped).toBe(5);
  });

  it('returns nothing for a log that is not a list', () => {
    expect(normalizeBattleLog('#2PP8VJ9Q', { error: 'oops' })).toEqual({ battles: [], skipped: 0 });
  });
});

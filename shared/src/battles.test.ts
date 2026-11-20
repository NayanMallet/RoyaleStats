import { describe, expect, it } from 'vitest';
import { formatPlayerTag, readBattleForPlayer } from './battles';

const side = (tag: string, crowns: number) => [{ tag, crowns }];

describe('formatPlayerTag', () => {
  it.each([' 2pp8vj9q', '#2PP8VJ9Q', '##2pp8vj9q'])('formats %j as #2PP8VJ9Q', (tag) => {
    expect(formatPlayerTag(tag)).toBe('#2PP8VJ9Q');
  });
});

describe('readBattleForPlayer', () => {
  it('reads the result of the player listed in team', () => {
    const battle = readBattleForPlayer(
      { battleTime: 't1', team: side('#P', 3), opponent: side('#X', 1) },
      'p',
    );

    expect(battle).toMatchObject({ battleTime: 't1', result: 'win', player: { tag: '#P' } });
    expect(battle?.opponent).toMatchObject({ tag: '#X' });
  });

  it('reads the result of the player listed in opponent from their side', () => {
    const battle = readBattleForPlayer(
      { battleTime: 't1', team: side('#X', 3), opponent: side('#P', 1) },
      '#P',
    );

    expect(battle).toMatchObject({
      result: 'loss',
      player: { tag: '#P' },
      opponent: { tag: '#X' },
    });
  });

  it('reads a draw', () => {
    expect(
      readBattleForPlayer({ battleTime: 't', team: side('#P', 1), opponent: side('#X', 1) }, '#P')
        ?.result,
    ).toBe('draw');
  });

  it.each([
    ['the player is absent', { battleTime: 't', team: side('#A', 3), opponent: side('#B', 1) }],
    ['there is no time', { team: side('#P', 3), opponent: side('#X', 1) }],
    ['the other side is missing', { battleTime: 't', team: side('#P', 3) }],
    ['crowns are missing', { battleTime: 't', team: [{ tag: '#P' }], opponent: side('#X', 1) }],
    ['it is not an object', null],
  ])('returns null when %s', (_label, raw) => {
    expect(readBattleForPlayer(raw, '#P')).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { MIN_SAMPLE, analyseDeck, type CardStat } from './services/deckAnalysis';

const stat = (card_name: string, usage_count: number, winRate: number): CardStat => ({
  card_name,
  usage_count,
  win_count: Math.round((usage_count * winRate) / 100),
});

// Meta sample: 4-elixir cards between 40 % and 60 %, plus rare cards below MIN_SAMPLE.
const STATS = [
  stat('Hog Rider', 1000, 50),
  stat('Musketeer', 1000, 40), // weak: 10 points below the meta
  stat('Valkyrie', 1000, 60), // better 4-elixir card
  stat('Mini P.E.K.K.A', 1000, 55), // better 4-elixir card
  stat('Fireball', 1000, 50),
  stat('The Log', 1000, 50),
  stat('Ice Spirit', 1000, 50),
  stat('Cannon', 1000, 50),
  stat('Skeletons', 1000, 50),
  stat('Mega Knight', 10, 90), // great rate but too few usages to be trusted
  stat('Knight', 1000, 52), // 3 elixir: not an alternative to Musketeer
];
const DEFINITIONS = [
  { name: 'Hog Rider', elixirCost: 4 },
  { name: 'Musketeer', elixirCost: 4 },
  { name: 'Valkyrie', elixirCost: 4 },
  { name: 'Mini P.E.K.K.A', elixirCost: 4 },
  { name: 'Fireball', elixirCost: 4 },
  { name: 'The Log', elixirCost: 2 },
  { name: 'Ice Spirit', elixirCost: 1 },
  { name: 'Cannon', elixirCost: 3 },
  { name: 'Skeletons', elixirCost: 1 },
  { name: 'Mega Knight', elixirCost: 7 },
  { name: 'Knight', elixirCost: 3 },
];
const DECK = [
  'Hog Rider',
  'Musketeer',
  'Fireball',
  'The Log',
  'Ice Spirit',
  'Cannon',
  'Skeletons',
  'Mega Knight',
];

describe('analyseDeck', () => {
  const analysis = analyseDeck(DECK, STATS, DEFINITIONS, 4321);

  it('rates only the cards with enough data', () => {
    const megaKnight = analysis.deck.find((card) => card.name === 'Mega Knight');

    expect(megaKnight).toMatchObject({ usage: 10, enoughData: false, winRate: null });
    expect(analysis.summary).toMatchObject({
      cardsWithEnoughData: 7,
      confidence: 'high',
      minSample: MIN_SAMPLE,
    });
  });

  it('weights the deck win rate by usage and compares it with the meta', () => {
    // 6 cards at 50 % and Musketeer at 40 %, all with 1000 usages.
    expect(analysis.summary.deckWinRate).toBe(48.57);
    expect(analysis.summary.metaWinRate).toBe(50.7);
    expect(analysis.summary.totalBattles).toBe(4321);
  });

  it('gives the average elixir cost of the deck', () => {
    // 4 + 4 + 4 + 2 + 1 + 3 + 1 + 7 = 26 / 8
    expect(analysis.summary.averageElixir).toBe(3.25);
  });

  it('suggests better cards with the same elixir cost for a weak card', () => {
    expect(analysis.suggestions).toEqual([
      {
        replace: 'Musketeer',
        winRate: 40,
        reason: expect.stringContaining('40 %'),
        alternatives: [
          { name: 'Valkyrie', elixirCost: 4, winRate: 60, usage: 1000 },
          { name: 'Mini P.E.K.K.A', elixirCost: 4, winRate: 55, usage: 1000 },
        ],
      },
    ]);
  });

  it('never suggests a card already in the deck nor one without enough data', () => {
    const names = analysis.suggestions.flatMap((s) => s.alternatives.map((a) => a.name));

    expect(names).not.toContain('Hog Rider');
    expect(names).not.toContain('Mega Knight');
  });

  it('has low confidence and no suggestion when the sample is empty', () => {
    const empty = analyseDeck(DECK, [], DEFINITIONS, 0);

    expect(empty.summary).toMatchObject({
      deckWinRate: null,
      metaWinRate: null,
      confidence: 'low',
    });
    expect(empty.suggestions).toEqual([]);
  });
});

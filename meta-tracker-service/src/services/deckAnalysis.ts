// Analysis of a deck against the collected meta (card_stats). Pure functions: the controller
// gives the card statistics and the card definitions, so the rules can be tested in isolation.
//
// Rules, kept simple and explainable to the player:
// - a card is only judged with at least MIN_SAMPLE usages in the sample, otherwise it is shown
//   as "not enough data" instead of being rated on noise;
// - the deck win rate is the average of its cards weighted by their usage;
// - a card is "weak" when its win rate is WEAK_MARGIN points below the meta reference (the
//   usage-weighted win rate of every card with enough data);
// - for a weak card, up to MAX_ALTERNATIVES cards with the same elixir cost, not in the deck,
//   with enough data and a win rate at least WEAK_MARGIN points higher are proposed.

export const MIN_SAMPLE = 50;
export const WEAK_MARGIN = 2;
export const MAX_ALTERNATIVES = 3;

export interface CardStat {
  card_name: string;
  usage_count: number;
  win_count: number;
}

export interface CardDefinition {
  name: string;
  elixirCost?: number;
}

export interface AnalysedCard {
  name: string;
  elixirCost: number | null;
  usage: number;
  wins: number;
  /** Percentage with 2 decimals, null when the sample is too small to judge. */
  winRate: number | null;
  enoughData: boolean;
}

export interface Alternative {
  name: string;
  elixirCost: number;
  winRate: number;
  usage: number;
}

export interface Suggestion {
  replace: string;
  winRate: number;
  reason: string;
  alternatives: Alternative[];
}

export interface DeckAnalysis {
  deck: AnalysedCard[];
  summary: {
    /** Usage-weighted win rate of the cards with enough data; null if none has. */
    deckWinRate: number | null;
    /** Same measure over every card of the sample: what "average" means here. */
    metaWinRate: number | null;
    averageElixir: number | null;
    cardsWithEnoughData: number;
    /** high: 7-8 cards with enough data, medium: 4-6, low: 0-3. */
    confidence: 'high' | 'medium' | 'low';
    totalBattles: number;
    minSample: number;
  };
  suggestions: Suggestion[];
}

const round2 = (value: number) => Math.round(value * 100) / 100;

function weightedWinRate(stats: CardStat[]): number | null {
  const usage = stats.reduce((sum, stat) => sum + stat.usage_count, 0);
  if (usage === 0) return null;
  const wins = stats.reduce((sum, stat) => sum + stat.win_count, 0);
  return round2((wins / usage) * 100);
}

function winRateOf(stat: CardStat): number {
  return round2((stat.win_count / stat.usage_count) * 100);
}

export function analyseDeck(
  deckCards: string[],
  allStats: CardStat[],
  definitions: CardDefinition[],
  totalBattles: number,
): DeckAnalysis {
  const statByName = new Map(allStats.map((stat) => [stat.card_name, stat]));
  const elixirByName = new Map(
    definitions
      .filter((card) => typeof card.elixirCost === 'number')
      .map((card) => [card.name, card.elixirCost as number]),
  );
  const reliableStats = allStats.filter((stat) => stat.usage_count >= MIN_SAMPLE);
  const metaWinRate = weightedWinRate(reliableStats);

  const deck: AnalysedCard[] = deckCards.map((name) => {
    const stat = statByName.get(name);
    const usage = stat?.usage_count ?? 0;
    const enoughData = usage >= MIN_SAMPLE;
    return {
      name,
      elixirCost: elixirByName.get(name) ?? null,
      usage,
      wins: stat?.win_count ?? 0,
      winRate: enoughData && stat ? winRateOf(stat) : null,
      enoughData,
    };
  });

  const judged = deck.filter((card) => card.enoughData);
  const deckWinRate = weightedWinRate(
    judged.map((card) => ({ card_name: card.name, usage_count: card.usage, win_count: card.wins })),
  );
  const elixirCosts = deck
    .map((card) => card.elixirCost)
    .filter((cost): cost is number => cost !== null);
  const averageElixir =
    elixirCosts.length > 0
      ? round2(elixirCosts.reduce((sum, cost) => sum + cost, 0) / elixirCosts.length)
      : null;

  const suggestions: Suggestion[] = [];
  if (metaWinRate !== null) {
    const inDeck = new Set(deckCards);
    for (const card of judged) {
      const cardWinRate = card.winRate;
      if (cardWinRate === null || cardWinRate > metaWinRate - WEAK_MARGIN) continue;

      const alternatives = reliableStats
        .filter(
          (stat) =>
            !inDeck.has(stat.card_name) &&
            card.elixirCost !== null &&
            elixirByName.get(stat.card_name) === card.elixirCost &&
            winRateOf(stat) >= cardWinRate + WEAK_MARGIN,
        )
        .map((stat) => ({
          name: stat.card_name,
          elixirCost: card.elixirCost as number,
          winRate: winRateOf(stat),
          usage: stat.usage_count,
        }))
        .sort((a, b) => b.winRate - a.winRate || b.usage - a.usage)
        .slice(0, MAX_ALTERNATIVES);

      suggestions.push({
        replace: card.name,
        winRate: cardWinRate,
        reason: `${card.name} gagne ${cardWinRate} % de ses combats dans l'échantillon, contre ${metaWinRate} % en moyenne.`,
        alternatives,
      });
    }
    suggestions.sort((a, b) => a.winRate - b.winRate);
  }

  const cardsWithEnoughData = judged.length;
  return {
    deck,
    summary: {
      deckWinRate,
      metaWinRate,
      averageElixir,
      cardsWithEnoughData,
      confidence: cardsWithEnoughData >= 7 ? 'high' : cardsWithEnoughData >= 4 ? 'medium' : 'low',
      totalBattles,
      minSample: MIN_SAMPLE,
    },
    suggestions,
  };
}

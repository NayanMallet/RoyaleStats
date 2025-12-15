export interface PlayerProfile {
    tag: string;
    name: string;
    expLevel: number;
    trophies: number;
    bestTrophies: number;
    wins: number;
    losses: number;
    battleCount: number;
    threeCrownWins: number;
    challengeCardsWon: number;
    tournamentCardsWon: number;
    role: string;
    clan?: {
        tag: string;
        name: string;
        badgeId: number;
    };
    arena?: {
        id: number;
        name: string;
    };
    leagueStatistics?: {
        currentSeason?: {
            trophies: number;
            bestTrophies: number;
        };
        previousSeason?: {
            id: string;
            trophies: number;
            bestTrophies: number;
        };
        bestSeason?: {
            id: string;
            trophies: number;
            bestTrophies: number;
        };
    };
    badges?: {
        name: string;
        level: number;
        maxLevel: number;
        progress: number;
        target?: number;
        iconUrls: {
            large: string;
        };
    }[];
    achievements?: {
        name: string;
        stars: number;
        value: number;
        target: number;
        info: string;
    }[];
    cards?: Card[];
    supportCards?: Card[];
    currentDeck: Card[];
    currentPathOfLegendSeasonResult?: {
        leagueNumber: number;
        trophies: number;
        rank: number | null;
    };
    lastPathOfLegendSeasonResult?: {
        leagueNumber: number;
        trophies: number;
        rank: number | null;
    };
    bestPathOfLegendSeasonResult?: {
        leagueNumber: number;
        trophies: number;
        rank: number | null;
    };
    progress?: {
        [key: string]: {
            arena?: {
                name: string;
                id: number;
            };
            trophies?: number;
            bestTrophies?: number;
        };
    };
    totalExpPoints?: number;
    starPoints?: number;
}

export interface Card {
    name: string;
    id: number;
    level: number;
    maxLevel: number;
    count: number;
    iconUrls: {
        medium: string;
        heroMedium?: string;
        evolutionMedium?: string;
    };
    rarity: string;
    elixirCost: number;
}

export async function fetchCards(): Promise<Card[]> {
    const response = await fetch('/api/clash/cards');
    if (!response.ok) throw new Error('Failed to fetch cards');
    const data = await response.json();
    return data.items || [];
}

export async function fetchPlayer(tag: string): Promise<PlayerProfile> {
    // Ensure the tag starts with '#'
    const formattedTag = tag.startsWith('#') ? tag : `#${tag}`;
    // URL encode the tag (replace # with %23) to be safe in URL
    const encodedTag = encodeURIComponent(formattedTag);

    const response = await fetch(`/api/clash/players/${encodedTag}`);

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('Player not found');
        }
        throw new Error(`Error fetching player: ${response.statusText}`);
    }

    return response.json();
}

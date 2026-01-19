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
    totalDonations?: number; // Added to fix TS error
}

export interface Card {
    name: string;
    id: number;
    level: number;
    maxLevel: number;
    rarity: string;
    count: number;
    elixirCost: number;
    iconUrls: {
        medium: string;
        heroMedium?: string;
        evolutionMedium?: string;
    };
    evolutionLevel?: number; // Added to fix type error
}

// -- Clan Types --
export interface ClanMember {
    tag: string;
    name: string;
    role: string;
    lastSeen: string;
    expLevel: number;
    trophies: number;
    arena: { id: number; name: string; };
    clanRank: number;
    previousClanRank: number;
    donations: number;
    donationsReceived: number;
}

export interface ClanDetails {
    tag: string;
    name: string;
    type: string;
    description: string;
    badgeId: number;
    clanScore: number;
    clanWarTrophies: number;
    location: { id: number; name: string; isCountry: boolean; countryCode: string; };
    requiredTrophies: number;
    donationsPerWeek: number;
    members: number;
    memberList: ClanMember[];
}

export async function fetchClan(tag: string): Promise<ClanDetails> {
    // tag needs to be URL encoded (hashes become %23) but usually the proxy handles it or we strip #
    // The previous fetchPlayer logic adds # if missing.
    // Let's assume input tag has # or not, API usually expects %23 if passed in path.
    const cleanTag = tag.startsWith('#') ? '%23' + tag.slice(1) : '%23' + tag;

    // Using the same proxy path convention
    const response = await fetch(`/api/clash/clans/${cleanTag}`);
    if (!response.ok) throw new Error('Failed to fetch clan details');
    return await response.json();
}

export function getClanBadgeUrl(badgeId: number): string {
    // RoyaleAPI assets often use badges_75 directory or just badges
    // If standard fails, try badges_75 or similar.
    // For now, attempting the most common pattern.
    // If badgeId is 0 or undefined, return a generic shield.
    if (!badgeId) return 'https://raw.githubusercontent.com/RoyaleAPI/cr-api-assets/master/badges/0.png';
    return `https://raw.githubusercontent.com/RoyaleAPI/cr-api-assets/master/badges/${badgeId}.png`;
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

export async function fetchPlayerBattles(tag: string): Promise<any[]> {
    const formattedTag = tag.startsWith('#') ? tag : `#${tag}`;
    const encodedTag = encodeURIComponent(formattedTag);
    const response = await fetch(`/api/clash/players/${encodedTag}/battles`);
    if (!response.ok) return [];
    return response.json();
}

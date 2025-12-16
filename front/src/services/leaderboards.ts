const API_BASE = '/api/clash'

export interface LeaderboardPlayer {
    tag: string
    name: string
    rank: number
    score?: number // Trophies or Pol Medals
    clan?: {
        tag: string
        name: string
        badgeId: number
    }
}

export async function fetchGlobalRankings(limit = 10): Promise<LeaderboardPlayer[]> {
    const res = await fetch(`${API_BASE}/locations/global/rankings/players?limit=${limit}`)
    if (!res.ok) throw new Error('Failed to fetch Global Rankings')
    const data = await res.json()
    return data.items
}

export async function fetchPathOfLegendRankings(limit = 10): Promise<LeaderboardPlayer[]> {
    // Note: Path of Legend endpoints might require specifying the season or use a different path
    // Standard endpoint: /locations/global/pathoflegend/players
    const res = await fetch(`${API_BASE}/locations/global/pathoflegend/players?limit=${limit}`)
    if (!res.ok) throw new Error('Failed to fetch Path of Legend Rankings')
    const data = await res.json()
    // Map eloRating to score for consistent usage
    return data.items.map((p: any) => ({
        ...p,
        score: p.eloRating || p.score
    }))
}

// Fetch list of all available season leaderboards
export async function fetchLocations(): Promise<{ id: number; name: string }[]> {
    const res = await fetch(`${API_BASE}/leaderboards`)
    if (!res.ok) throw new Error('Failed to fetch Leaderboards List')
    const data = await res.json()
    return data.items
}

// Fetch rankings for a specific leaderboard season
export async function fetchLocationRankings(leaderboardId: number, limit = 10): Promise<LeaderboardPlayer[]> {
    const res = await fetch(`${API_BASE}/leaderboard/${leaderboardId}?limit=${limit}`)
    if (!res.ok) {
        console.warn(`Failed to fetch rankings for leaderboard ${leaderboardId}`)
        return []
    }
    const data = await res.json()
    return data.items
}

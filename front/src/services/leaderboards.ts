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
    return data.items
}

// Placeholder for other modes if specific endpoints exist
// "Merge Tactics" / "2v2" might not have direct global ranking endpoints in public API

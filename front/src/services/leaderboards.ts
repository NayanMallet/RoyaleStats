import { getBadgeId, getClanBadgeUrl, initBadges } from "./badges"

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
        badgeUrl?: string
    }
}

export async function fetchWithRetry(url: string, retries = 3, delay = 1000): Promise<Response> {
    try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Status: ${res.status}`)
        return res
    } catch (e) {
        if (retries > 0) {
            await new Promise(r => setTimeout(r, delay))
            return fetchWithRetry(url, retries - 1, delay * 2)
        }
        throw e
    }
}

// Scrape RoyaleAPI for top 100 Level 16 players
export async function fetchGlobalRankings(): Promise<LeaderboardPlayer[]> {
    console.log('Scraping RoyaleAPI Level 16 Leaderboard (JSON Mode)...')
    try {
        await initBadges()
        // The HTML showed data is loaded from ?json=1
        const res = await fetchWithRetry('/api/royaleapi/players/level/16?json=1')
        const data = await res.json()
        console.log(data)

        const rows: any[] = data.data || []

        if (!Array.isArray(rows) || rows.length === 0) {
            console.warn('JSON returned no data', data)
            throw new Error('No data found in JSON response')
        }

        const players = await Promise.all(rows.slice(0, 100).map(async (p, index) => {
            let badgeId = 0
            if (p.clan?.tag) {
                try {
                    badgeId = await getBadgeId(p.clan.tag)
                } catch (e) {
                    console.error('Failed to fetch badge ID', e)
                }
            }

            return {
                rank: p.rank || index + 1,
                name: p.name || 'Unknown',
                tag: p.tag || '',
                // The JSON shows 'best_trophies', but sometimes 'trophies' is used for current. 
                // Using best_trophies as seen in screenshot.
                score: p.trophies || p.best_trophies || 0,
                clan: p.clan ? {
                    name: p.clan.name || 'Unknown',
                    tag: p.clan.tag || '',
                    // Mapping both standard API naming (badgeId) and potentially formatted (badge_id)
                    badgeId: badgeId,
                    badgeUrl: getClanBadgeUrl(badgeId)
                } : undefined
            } as LeaderboardPlayer
        }))

        console.log(`Mapped ${players.length} players from RoyaleAPI JSON`)
        return players.slice(0, 100)

    } catch (e) {
        console.error('Failed to scrape RoyaleAPI JSON', e)
        return []
    }
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

// Rankings shown on the home page. Every function throws an ApiError or a NetworkError when its
// source fails: an unavailable ranking must never look like an empty one (RST-11).

import { apiEndpoints } from '@/config/api'
import { getBadgeId, getClanBadgeUrl, initBadges } from './badges'
import { http } from './http'

export interface LeaderboardPlayer {
  tag: string
  name: string
  rank: number
  score?: number // Trophies or Path of Legend medals
  clan?: {
    tag: string
    name: string
    badgeId: number
    badgeUrl?: string
  }
}

/** Season rankings offered by the Clash Royale API under these names. */
export type SeasonName = 'Merge Tactics' | '2v2 League'

interface RoyaleApiRow {
  rank?: number
  name?: string
  tag?: string
  trophies?: number
  best_trophies?: number
  clan?: { tag?: string; name?: string }
}

interface ClashRankingItem {
  tag: string
  name: string
  rank: number
  eloRating?: number
  score?: number
  clan?: LeaderboardPlayer['clan']
}

/** Top 100 of the trophy road (level 16 players), read from RoyaleAPI through the Gateway. */
export async function fetchGlobalRankings(): Promise<LeaderboardPlayer[]> {
  const [data] = await Promise.all([
    http.getPublic<{ data?: RoyaleApiRow[] }>(apiEndpoints.royaleApi.trophyRankings),
    initBadges(),
  ])
  const rows = Array.isArray(data.data) ? data.data.slice(0, 100) : []

  return Promise.all(
    rows.map(async (row, index): Promise<LeaderboardPlayer> => {
      // The clan badge is decoration: without it, the row shows a shield icon.
      const badgeId = row.clan?.tag ? await getBadgeId(row.clan.tag).catch(() => 0) : 0
      return {
        rank: row.rank || index + 1,
        name: row.name || 'Inconnu',
        tag: row.tag || '',
        score: row.trophies || row.best_trophies || 0,
        clan: row.clan
          ? {
              name: row.clan.name || 'Inconnu',
              tag: row.clan.tag || '',
              badgeId,
              badgeUrl: getClanBadgeUrl(badgeId),
            }
          : undefined,
      }
    }),
  )
}

export async function fetchPathOfLegendRankings(limit = 10): Promise<LeaderboardPlayer[]> {
  const data = await http.getPublic<{ items?: ClashRankingItem[] }>(
    apiEndpoints.clash.pathOfLegend(limit),
  )
  // eloRating is the Path of Legend score.
  return (data.items ?? []).map((player) => ({
    ...player,
    score: player.eloRating ?? player.score,
  }))
}

let seasonsPromise: Promise<{ id: number; name: string }[]> | null = null

/** Season leaderboards (id and name), read once per session; a failure is retried next time. */
function fetchSeasonLeaderboards(): Promise<{ id: number; name: string }[]> {
  seasonsPromise ??= http
    .getPublic<{ items?: { id: number; name: string }[] }>(apiEndpoints.clash.seasonLeaderboards)
    .then((data) => data.items ?? [])
    .catch((error) => {
      seasonsPromise = null
      throw error
    })
  return seasonsPromise
}

/**
 * Current ranking of a season mode: the most recent leaderboard with this name. No leaderboard
 * for this season answers an empty list, which is a real "nothing to show", not an error.
 */
export async function fetchSeasonRankings(
  season: SeasonName,
  limit = 10,
): Promise<LeaderboardPlayer[]> {
  const ids = (await fetchSeasonLeaderboards())
    .filter((leaderboard) => leaderboard.name === season)
    .map((leaderboard) => leaderboard.id)
  if (ids.length === 0) return []

  const data = await http.getPublic<{ items?: ClashRankingItem[] }>(
    apiEndpoints.clash.seasonRankings(Math.max(...ids), limit),
  )
  return data.items ?? []
}

// Every URL the front calls, in one place.
// Empty by default: calls stay relative (/api/...) and go through nginx (Docker) or the Vite proxy
// (dev). Set VITE_API_GATEWAY_URL only if the front and the Gateway are served from different
// origins.
const API_GATEWAY_BASE_URL = import.meta.env.VITE_API_GATEWAY_URL ?? ''
const API = `${API_GATEWAY_BASE_URL}/api`

/** "#2pp8vj9q", "2PP8VJ9Q" → "%232PP8VJ9Q": the tag as a path segment, with its #. */
export function encodeTag(tag: string): string {
  const trimmed = tag.trim()
  return encodeURIComponent(trimmed.startsWith('#') ? trimmed : `#${trimmed}`)
}

export const apiEndpoints = {
  auth: {
    login: `${API}/users/login`,
    register: `${API}/users/register`,
    me: `${API}/users/me`,
  },
  items: {
    list: `${API}/items`,
    create: `${API}/items`,
  },
  link: {
    create: `${API}/link`,
    update: (userId: number) => `${API}/link/${userId}`,
    get: (userId: number) => `${API}/link/${userId}`,
    getByTag: (tag: string) => `${API}/link/tag/${encodeURIComponent(tag)}`,
    delete: (userId: number) => `${API}/link/${userId}`,
  },
  clash: {
    player: (tag: string) => `${API}/clash/players/${encodeTag(tag)}`,
    clan: (tag: string) => `${API}/clash/clans/${encodeTag(tag)}`,
    cards: `${API}/clash/cards`,
    seasonLeaderboards: `${API}/clash/leaderboards`,
    seasonRankings: (leaderboardId: number, limit: number) =>
      `${API}/clash/leaderboard/${leaderboardId}?limit=${limit}`,
    pathOfLegend: (limit: number) =>
      `${API}/clash/locations/global/pathoflegend/players?limit=${limit}`,
  },
  meta: {
    snapshot: `${API}/meta/snapshot`,
    ingest: (tag: string) => `${API}/meta/players/${encodeTag(tag)}/ingest`,
  },
  royaleApi: {
    /** Trophy road ranking (level 16 players), relayed by the Gateway. */
    trophyRankings: `${API}/royaleapi/players/level/16?json=1`,
  },
}

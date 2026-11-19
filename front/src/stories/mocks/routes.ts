/**
 * Mocked API routes shared by several stories (an organism and the page that hosts it).
 * Each helper returns `parameters.mockApi` entries, see ./api.ts.
 */
import type { PlayerProfile } from '@/services/clash.service'
import type { PlayerLink } from '@/services/link.service'
import type { MockRoute } from './api'
import {
  demoCardDefinitions,
  demoClan,
  demoLink,
  demoPathOfLegendRankings,
  demoPlayerBattles,
  demoPlayerProfile,
  demoSeasonLeaderboards,
  demoTrophyRankings,
} from './fixtures'

/**
 * Clan badge names, loaded once from GitHub by services/badges.ts and cached for the session:
 * never delayed nor failed, otherwise every later story would wait for it. Left empty, so the
 * components fall back to their shield icon instead of downloading a badge picture.
 */
export const allianceBadgesRoute: MockRoute = { url: /alliance_badges\.json$/, body: [] }

/** Leaderboards.vue: Path of Legend, trophies (RoyaleAPI) and season rankings. */
export function leaderboardsRoutes(extra: Partial<MockRoute> = {}): MockRoute[] {
  return [
    {
      url: '/api/clash/locations/global/pathoflegend/players',
      body: demoPathOfLegendRankings,
      ...extra,
    },
    { url: '/api/royaleapi/players/level/16', body: demoTrophyRankings, ...extra },
    { url: '/api/clash/leaderboards', body: demoSeasonLeaderboards, ...extra },
    // Season rankings left empty: the component then derives Merge and 2v2 from Path of Legend.
    { url: /^\/api\/clash\/leaderboard\/\d+/, body: { items: [] }, ...extra },
    allianceBadgesRoute,
  ]
}

interface PlayerRoutesOptions {
  profile?: PlayerProfile
  /** RoyaleStats account linked to this tag; `null` answers 404 (tag linked to no account). */
  link?: PlayerLink | null
  /** Overrides the profile route only: `delay`, `status`, `body`… */
  player?: Partial<MockRoute>
}

/**
 * Everything PlayerStats.vue calls for one player: card definitions, profile, linked account
 * (social links), last battles and their ingestion by the meta-service, then the clan details
 * opened from the hero banner.
 */
export function playerRoutes({
  profile = demoPlayerProfile,
  link = demoLink,
  player = {},
}: PlayerRoutesOptions = {}): MockRoute[] {
  const tag = encodeURIComponent(profile.tag)
  const routes: MockRoute[] = [
    { url: '/api/clash/cards', body: demoCardDefinitions },
    { url: `/api/clash/players/${tag}`, body: profile, ...player },
    { url: `/api/clash/players/${tag}/battles`, body: demoPlayerBattles },
    link
      ? { url: `/api/link/tag/${tag}`, body: link }
      : { url: `/api/link/tag/${tag}`, status: 404, body: { error: 'Not found' } },
    {
      method: 'POST',
      url: '/api/meta/ingest/battles',
      status: 202,
      body: { ingested: demoPlayerBattles.length },
    },
    allianceBadgesRoute,
  ]
  if (profile.clan?.tag === demoClan.tag) {
    routes.push({ url: `/api/clash/clans/${encodeURIComponent(demoClan.tag)}`, body: demoClan })
  }
  return routes
}

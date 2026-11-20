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
  demoSeasonRankings,
  demoTrophyRankings,
} from './fixtures'

/**
 * Clan badge names, loaded once from GitHub by services/badges.ts and cached for the session:
 * never delayed nor failed, otherwise every later story would wait for it. Left empty, so the
 * components fall back to their shield icon instead of downloading a badge picture.
 */
export const allianceBadgesRoute: MockRoute = { url: /alliance_badges\.json$/, body: [] }

interface LeaderboardsRoutesOptions {
  /** Replaces the Path of Legend (« Ranked ») list. */
  pathOfLegend?: unknown
  /** Overrides the RoyaleAPI trophy ranking route only: `status`, `delay`… */
  trophies?: Partial<MockRoute>
  /** Season leaderboards (id and name) offered by the API. */
  seasons?: unknown
}

/**
 * Leaderboards.vue: Path of Legend, trophies (RoyaleAPI) and season rankings.
 * `extra` applies to every API route (latency, error); `options` changes one source at a time.
 */
export function leaderboardsRoutes(
  extra: Partial<MockRoute> = {},
  {
    pathOfLegend = demoPathOfLegendRankings,
    trophies = {},
    seasons = demoSeasonLeaderboards,
  }: LeaderboardsRoutesOptions = {},
): MockRoute[] {
  return [
    {
      url: '/api/clash/locations/global/pathoflegend/players',
      body: pathOfLegend,
      ...extra,
    },
    { url: '/api/royaleapi/players/level/16', body: demoTrophyRankings, ...extra, ...trophies },
    { url: '/api/clash/leaderboards', body: seasons, ...extra },
    { url: /^\/api\/clash\/leaderboard\/\d+/, body: demoSeasonRankings, ...extra },
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
 * (social links), the ingestion of the player's battles by the meta-service, then the clan details
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
    link
      ? { url: `/api/link/tag/${tag}`, body: link }
      : { url: `/api/link/tag/${tag}`, status: 404, body: { error: 'Not found' } },
    {
      method: 'POST',
      url: `/api/meta/players/${tag}/ingest`,
      body: {
        playerTag: profile.tag,
        ingested: demoPlayerBattles.length,
        duplicates: 0,
        invalid: 0,
        skipped: 0,
      },
    },
    allianceBadgesRoute,
  ]
  if (profile.clan?.tag === demoClan.tag) {
    routes.push({ url: `/api/clash/clans/${encodeURIComponent(demoClan.tag)}`, body: demoClan })
  }
  return routes
}

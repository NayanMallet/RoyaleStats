import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Route = { status?: number; body?: unknown; reject?: Error }

/** fetch answering by URL: the first route whose key is contained in the URL. */
function mockApi(routes: Record<string, Route>) {
  const fetchMock = vi.fn(async (input: RequestInfo) => {
    const url = String(input)
    const route = Object.entries(routes).find(([key]) => url.includes(key))?.[1]
    if (!route) throw new Error(`Unexpected call: ${url}`)
    if (route.reject) throw route.reject
    const status = route.status ?? 200
    return {
      ok: status < 400,
      status,
      headers: new Headers(),
      json: async () => route.body,
    }
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const SEASONS = {
  items: [
    { id: 170000004, name: 'Merge Tactics' },
    { id: 170000005, name: 'Merge Tactics' },
    { id: 170000006, name: '2v2 League' },
  ],
}

const UNAVAILABLE = {
  status: 503,
  body: { error: 'ServiceUnavailable', message: 'Indisponible', statusCode: 503 },
}

// The season list is cached by the module: each test starts from a fresh module (hence errors
// compared by name: a fresh module has its own ApiError class).
async function load() {
  vi.resetModules()
  return import('../leaderboards')
}

describe('leaderboards service', () => {
  beforeEach(() => {
    mockApi({ alliance_badges: { body: [] } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('Path of Legend', () => {
    it('uses the elo rating as score', async () => {
      mockApi({
        pathoflegend: { body: { items: [{ tag: '#A', name: 'A', rank: 1, eloRating: 3200 }] } },
      })
      const { fetchPathOfLegendRankings } = await load()

      await expect(fetchPathOfLegendRankings(20)).resolves.toEqual([
        { tag: '#A', name: 'A', rank: 1, eloRating: 3200, score: 3200 },
      ])
    })

    it('throws the API error instead of answering an empty ranking', async () => {
      mockApi({ pathoflegend: UNAVAILABLE })
      const { fetchPathOfLegendRankings } = await load()

      await expect(fetchPathOfLegendRankings()).rejects.toMatchObject({
        name: 'ApiError',
        status: 503,
      })
    })
  })

  describe('trophy ranking (RoyaleAPI)', () => {
    it('maps the RoyaleAPI rows, with the clan badge when it can be read', async () => {
      mockApi({
        alliance_badges: { body: [{ id: 16000001, name: 'Flame_01' }] },
        royaleapi: {
          body: {
            data: [
              { rank: 1, name: 'A', tag: '#A', trophies: 12000, clan: { tag: '#C', name: 'Clan' } },
              { name: 'B', tag: '#B', best_trophies: 11000 },
            ],
          },
        },
        '/clans/': { body: { badgeId: 16000001 } },
      })
      const { fetchGlobalRankings } = await load()

      const players = await fetchGlobalRankings()

      expect(players[0]).toMatchObject({
        rank: 1,
        score: 12000,
        clan: { tag: '#C', name: 'Clan', badgeId: 16000001 },
      })
      expect(players[1]).toMatchObject({ rank: 2, score: 11000, clan: undefined })
    })

    it('keeps a row whose clan badge cannot be read', async () => {
      mockApi({
        alliance_badges: { body: [] },
        royaleapi: {
          body: { data: [{ name: 'A', tag: '#A', clan: { tag: '#C', name: 'Clan' } }] },
        },
        '/clans/': UNAVAILABLE,
      })
      const { fetchGlobalRankings } = await load()

      await expect(fetchGlobalRankings()).resolves.toMatchObject([{ clan: { badgeId: 0 } }])
    })

    it('throws when RoyaleAPI fails, instead of answering an empty ranking', async () => {
      mockApi({ alliance_badges: { body: [] }, royaleapi: { status: 502, body: undefined } })
      const { fetchGlobalRankings } = await load()

      await expect(fetchGlobalRankings()).rejects.toMatchObject({ name: 'ApiError' })
    })

    it('throws a NetworkError when the Gateway cannot be reached', async () => {
      mockApi({
        alliance_badges: { body: [] },
        royaleapi: { reject: new TypeError('Failed to fetch') },
      })
      const { fetchGlobalRankings } = await load()

      await expect(fetchGlobalRankings()).rejects.toMatchObject({ name: 'NetworkError' })
    })
  })

  describe('season rankings', () => {
    it('reads the most recent leaderboard of the season', async () => {
      const fetchMock = mockApi({
        '/leaderboards': { body: SEASONS },
        '/leaderboard/170000005': { body: { items: [{ tag: '#M', name: 'M', rank: 1 }] } },
      })
      const { fetchSeasonRankings } = await load()

      await expect(fetchSeasonRankings('Merge Tactics', 20)).resolves.toEqual([
        { tag: '#M', name: 'M', rank: 1 },
      ])
      expect(String(fetchMock.mock.calls[fetchMock.mock.calls.length - 1]?.[0])).toContain(
        '/leaderboard/170000005?limit=20',
      )
    })

    it('answers an empty ranking when the season has no leaderboard', async () => {
      mockApi({ '/leaderboards': { body: { items: [] } } })
      const { fetchSeasonRankings } = await load()

      await expect(fetchSeasonRankings('2v2 League')).resolves.toEqual([])
    })

    it('throws when the ranking fails, and reads the season list once', async () => {
      const fetchMock = mockApi({
        '/leaderboards': { body: SEASONS },
        '/leaderboard/': UNAVAILABLE,
      })
      const { fetchSeasonRankings } = await load()

      await expect(fetchSeasonRankings('Merge Tactics')).rejects.toMatchObject({ name: 'ApiError' })
      await expect(fetchSeasonRankings('2v2 League')).rejects.toMatchObject({ name: 'ApiError' })
      const seasonCalls = fetchMock.mock.calls.filter(([url]) =>
        String(url).endsWith('/leaderboards'),
      )
      expect(seasonCalls).toHaveLength(1)
    })

    it('asks the season list again after a failure', async () => {
      const fetchMock = mockApi({ '/leaderboards': UNAVAILABLE })
      const { fetchSeasonRankings } = await load()

      await expect(fetchSeasonRankings('Merge Tactics')).rejects.toMatchObject({ name: 'ApiError' })
      await expect(fetchSeasonRankings('Merge Tactics')).rejects.toMatchObject({ name: 'ApiError' })
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })
  })
})

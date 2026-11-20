import { reactive } from 'vue'
import { apiEndpoints } from '@/config/api'
import { fetchWithTimeout, http } from './http'

const BADGES_JSON_URL = 'https://royaleapi.github.io/cr-api-data/json/alliance_badges.json'
const BADGES_ASSETS_URL = 'https://royaleapi.github.io/cr-api-assets/badges'

// Reactive map to ensure components update when data loads
// Key: badgeId, Value: badgeName
const badgeMap = reactive<Record<number, string>>({})
let isLoaded = false
let loadPromise: Promise<void> | null = null

export async function initBadges() {
  if (isLoaded) return
  if (loadPromise) return loadPromise

  // Badge names are decoration: on failure the components show a shield icon instead.
  loadPromise = fetchWithTimeout(BADGES_JSON_URL)
    .then((res) => res.json() as Promise<{ id: number; name: string }[]>)
    .then((data) => {
      data.forEach((item) => {
        badgeMap[item.id] = item.name
      })
      isLoaded = true
    })
    .catch((err) => {
      console.error('Failed to load alliance badges', err)
      isLoaded = true // Stop retrying on every call
    })

  return loadPromise
}

export async function getBadgeId(clanTag: string): Promise<number> {
  const clan = await http.getPublic<{ badgeId: number }>(apiEndpoints.clash.clan(clanTag))
  return clan.badgeId
}

export function getClanBadgeUrl(badgeId: number | undefined): string | undefined {
  if (!badgeId) return undefined
  // If not loaded, trigger load (optional, or rely on explicit init)
  if (!isLoaded && !loadPromise) {
    initBadges()
  }

  const name = badgeMap[badgeId]
  if (!name) return undefined

  return `${BADGES_ASSETS_URL}/${name}.png`
}

import { apiErrorFromResponse, fetchWithTimeout } from './http'

export interface CardStat {
  card_name: string
  usage_count: number
  win_count: number
  win_rate: number
}

export interface MetaSnapshot {
  totalBattles: number
  topCards: CardStat[]
  generatedAt: string
}

export async function fetchMetaSnapshot(): Promise<MetaSnapshot> {
  const response = await fetchWithTimeout('/api/meta/snapshot')
  if (!response.ok) {
    throw await apiErrorFromResponse(response)
  }
  const data = await response.json()
  return data.snapshot
}

/**
 * Asks the meta-service to add this player's recent battles to the meta. The server fetches the
 * battles itself (RST-31): the browser never sends battle data. Best effort, silent on failure.
 */
export async function ingestPlayerBattles(tag: string): Promise<void> {
  const formattedTag = tag.startsWith('#') ? tag : `#${tag}`
  try {
    await fetchWithTimeout(`/api/meta/players/${encodeURIComponent(formattedTag)}/ingest`, {
      method: 'POST',
    })
  } catch (error) {
    console.warn('[Meta] Could not ingest the battle log', error)
  }
}

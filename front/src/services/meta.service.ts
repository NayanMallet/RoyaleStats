import { apiEndpoints } from '@/config/api'
import { http } from './http'

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
  const data = await http.getPublic<{ snapshot: MetaSnapshot }>(apiEndpoints.meta.snapshot)
  return data.snapshot
}

/**
 * Asks the meta-service to add this player's recent battles to the meta. The server fetches the
 * battles itself (RST-31): the browser never sends battle data. Best effort, silent on failure.
 */
export async function ingestPlayerBattles(tag: string): Promise<void> {
  try {
    await http.post(apiEndpoints.meta.ingest(tag), {})
  } catch (error) {
    console.warn('[Meta] Could not ingest the battle log', error)
  }
}

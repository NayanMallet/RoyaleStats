import { apiErrorFromResponse, NetworkError } from './http'

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
  let response: Response
  try {
    response = await fetch('/api/meta/snapshot')
  } catch (error) {
    throw new NetworkError(false, { cause: error })
  }
  if (!response.ok) {
    throw await apiErrorFromResponse(response)
  }
  const data = await response.json()
  return data.snapshot
}

export async function ingestBattles(battles: any[]) {
  try {
    await fetch('/api/meta/ingest/battles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ battles }),
    })
  } catch (e) {
    // silent fail
    console.error('Failed to ingest battles', e)
  }
}

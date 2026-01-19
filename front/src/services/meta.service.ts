
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
    const response = await fetch('/api/meta/snapshot')
    if (!response.ok) {
        throw new Error('Failed to fetch meta snapshot')
    }
    const data = await response.json()
    return data.snapshot
}

export async function ingestBattles(battles: any[]) {
    try {
        await fetch('/api/meta/ingest/battles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ battles })
        })
    } catch (e) {
        // silent fail
        console.error('Failed to ingest battles', e)
    }
}

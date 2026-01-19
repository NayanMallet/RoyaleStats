import fetch from 'node-fetch'
import { logger } from 'shared'

const API_KEY = process.env.CLASH_ROYALE_API_KEY
const BASE_URL = process.env.CLASH_ROYALE_BASE_URL || 'https://api.clashroyale.com/v1'

if (!API_KEY) {
    logger.warn('CLASH_ROYALE_API_KEY not set - Clash Data Service will not work properly')
}

export async function fetchFromClashAPI<T>(endpoint: string): Promise<T> {
    const url = `${BASE_URL}${endpoint}`

    logger.info(`Calling Clash Royale API: ${endpoint}`)

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json',
            },
        })

        if (!response.ok) {
            const errorText = await response.text()
            logger.error(`Clash API error ${response.status}: ${errorText}`)

            if (response.status === 404) {
                throw new Error('Resource not found')
            } else if (response.status === 403) {
                throw new Error('Invalid API key or access denied')
            } else if (response.status === 429) {
                throw new Error('Rate limit exceeded')
            } else {
                throw new Error(`Clash Royale API error: ${response.status}`)
            }
        }

        const data = await response.json()
        return data as T
    } catch (error) {
        if (error instanceof Error) {
            logger.error('Clash API request failed:', error.message)
            throw error
        }
        throw new Error('Unknown error calling Clash Royale API')
    }
}

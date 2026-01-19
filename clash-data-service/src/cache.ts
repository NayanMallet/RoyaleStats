import { logger } from 'shared'

interface CacheEntry<T> {
    data: T
    expiry: number
}

class SimpleCache {
    private cache = new Map<string, CacheEntry<any>>()
    private defaultTTL = 5 * 60 * 1000 // 5 minutes default

    set<T>(key: string, data: T, ttl?: number): void {
        const expiry = Date.now() + (ttl || this.defaultTTL)
        this.cache.set(key, { data, expiry })
        logger.debug(`Cache SET: ${key} (TTL: ${ttl || this.defaultTTL}ms)`)
    }

    get<T>(key: string): T | null {
        const entry = this.cache.get(key)

        if (!entry) {
            logger.debug(`Cache MISS: ${key}`)
            return null
        }

        if (Date.now() > entry.expiry) {
            logger.debug(`Cache EXPIRED: ${key}`)
            this.cache.delete(key)
            return null
        }

        logger.debug(`Cache HIT: ${key}`)
        return entry.data as T
    }

    clear(): void {
        this.cache.clear()
        logger.info('Cache cleared')
    }

    // Cleanup expired entries periodically
    startCleanup(interval: number = 60000): void {
        setInterval(() => {
            const now = Date.now()
            let count = 0

            for (const [key, entry] of this.cache.entries()) {
                if (now > entry.expiry) {
                    this.cache.delete(key)
                    count++
                }
            }

            if (count > 0) {
                logger.debug(`Cache cleanup: removed ${count} expired entries`)
            }
        }, interval)
    }
}

export const cache = new SimpleCache()

// Start cleanup on import
cache.startCleanup()

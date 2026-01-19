import { Request, Response } from 'express'
import { getDatabase } from '../database'
import { logger } from 'shared'

export async function getMetaSnapshot(req: Request, res: Response) {
    try {
        const db = getDatabase()

        // Get top 10 most used cards
        const topCards = db.prepare(`
      SELECT 
        card_name,
        usage_count,
        win_count,
        ROUND(CAST(win_count AS FLOAT) / NULLIF(usage_count, 0) * 100, 2) as win_rate
      FROM card_stats
      WHERE usage_count > 0
      ORDER BY usage_count DESC
      LIMIT 10
    `).all()

        // Get total battles count
        const battleCount = db.prepare('SELECT COUNT(*) as count FROM battles').get() as { count: number }

        res.json({
            snapshot: {
                totalBattles: battleCount?.count || 0,
                topCards: topCards || [],
                generatedAt: new Date().toISOString(),
            },
        })
    } catch (error) {
        logger.error('Error getting meta snapshot:', error)
        res.status(500).json({
            error: 'InternalServerError',
            message: 'Failed to get meta snapshot',
        })
    }
}

export async function analyzeDeck(req: Request, res: Response) {
    try {
        const { cards } = req.body

        if (!Array.isArray(cards) || cards.length !== 8) {
            return res.status(400).json({
                error: 'ValidationError',
                message: 'Deck must contain exactly 8 cards',
            })
        }

        const db = getDatabase()

        // Get stats for each card in the deck
        const cardStats = []
        let totalUsage = 0
        let totalWinRate = 0

        const stmt = db.prepare(`
        SELECT 
          card_name,
          usage_count,
          win_count,
          ROUND(CAST(win_count AS FLOAT) / NULLIF(usage_count, 0) * 100, 2) as win_rate
        FROM card_stats
        WHERE card_name = ?
      `)

        for (const cardName of cards) {
            const stats = stmt.get(cardName) as any

            if (stats) {
                cardStats.push(stats)
                totalUsage += stats.usage_count
                totalWinRate += stats.win_rate || 0
            }
        }

        const avgWinRate = cardStats.length > 0 ? totalWinRate / cardStats.length : 50
        const score = Math.min(100, Math.max(0, avgWinRate))

        res.json({
            deck: cards,
            score: Math.round(score),
            analysis: {
                avgWinRate: avgWinRate.toFixed(2),
                totalUsage: totalUsage,
                cardStats: cardStats,
            },
            recommendations: score < 60 ? [
                'Consider replacing low win-rate cards',
                'Check the meta snapshot for popular alternatives',
            ] : [
                'Your deck looks solid!',
                'Consider minor optimizations based on card levels',
            ],
        })
    } catch (error) {
        logger.error('Error analyzing deck:', error)
        res.status(500).json({
            error: 'InternalServerError',
            message: 'Failed to analyze deck',
        })
    }
}

export async function getRecommendations(req: Request, res: Response) {
    try {
        const { playerTag } = req.params

        const db = getDatabase()
        const topCards = db.prepare(`
      SELECT card_name, win_rate
      FROM (
        SELECT 
          card_name,
          ROUND(CAST(win_count AS FLOAT) / NULLIF(usage_count, 0) * 100, 2) as win_rate
        FROM card_stats
        WHERE usage_count > 10
      )
      ORDER BY win_rate DESC
      LIMIT 5
    `).all()

        res.json({
            playerTag: playerTag,
            recommendations: {
                topMetaCards: topCards || [],
                suggestions: [
                    'Try incorporating high win-rate cards from the current meta',
                    'Balance your elixir cost across your deck',
                    'Ensure you have both offensive and defensive options',
                ],
            },
        })
    } catch (error) {
        logger.error('Error getting recommendations:', error)
        res.status(500).json({
            error: 'InternalServerError',
            message: 'Failed to get recommendations',
        })
    }
}

export async function ingestBattles(req: Request, res: Response) {
    try {
        const { battles } = req.body

        if (!Array.isArray(battles)) {
            return res.status(400).json({
                error: 'ValidationError',
                message: 'battles must be an array',
            })
        }

        const db = getDatabase()
        let ingested = 0

        const insertBattle = db.prepare(`INSERT INTO battles (player_tag, battle_time, deck_cards, opponent_deck, result, trophies)
         VALUES (?, ?, ?, ?, ?, ?)`)

        const updateCardStats = db.prepare(`
            INSERT INTO card_stats (card_name, usage_count, win_count)
            VALUES (?, 1, ?)
            ON CONFLICT(card_name) DO UPDATE SET
              usage_count = usage_count + 1,
              win_count = win_count + ?,
              updated_at = CURRENT_TIMESTAMP
          `)

        for (const battle of battles) {
            const { playerTag, battleTime, deckCards, opponentDeck, result, trophies } = battle

            // Insert battle
            insertBattle.run(
                playerTag,
                battleTime,
                JSON.stringify(deckCards),
                JSON.stringify(opponentDeck),
                result,
                trophies,
            )

            // Update card statistics
            if (Array.isArray(deckCards)) {
                for (const card of deckCards) {
                    const isWin = result === 'win' ? 1 : 0
                    updateCardStats.run(card, isWin, isWin)
                }
            }

            ingested++
        }

        logger.info(`Ingested ${ingested} battles`)
        res.json({ ingested })
    } catch (error) {
        logger.error('Error ingesting battles:', error)
        res.status(500).json({
            error: 'InternalServerError',
            message: 'Failed to ingest battles',
        })
    }
}

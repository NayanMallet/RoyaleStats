import fetch from 'node-fetch';
import { logger } from 'shared';
import { processBattles } from './services/ingestionService';

const DATA_SERVICE_URL = process.env.CLASH_DATA_SERVICE_URL || 'http://clash-data-service:3004';

async function fetchTopPlayers() {
  try {
    const res = await fetch(`${DATA_SERVICE_URL}/locations/global/pathoflegend/players`);
    if (!res.ok) throw new Error(`Failed to fetch top players: ${res.statusText}`);
    const data = await res.json();
    return (data.items || []).slice(0, 1000); // Top 1000
  } catch (e) {
    logger.error('Error fetching top players', e);
    return [];
  }
}

async function fetchPlayerBattles(tag: string) {
  try {
    const encodedTag = encodeURIComponent(tag);
    const res = await fetch(`${DATA_SERVICE_URL}/players/${encodedTag}/battles`);
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Failed to fetch battles: ${res.statusText}`);
    return await res.json();
  } catch (e) {
    // Log but don't crash
    logger.warn(`Error fetching battles for ${tag}`, e);
    return [];
  }
}

export function startWorker() {
  logger.info('Starting Meta Tracker Background Worker...');

  const runJob = async () => {
    logger.info('[Worker] Starting scheduled ingestion job...');
    const players = await fetchTopPlayers();
    logger.info(`[Worker] Found ${players.length} top players. Processing...`);

    let totalIngested = 0;

    for (const player of players) {
      const rawBattles = await fetchPlayerBattles(player.tag);

      // Map raw API battles to our internal format
      const cleanBattles = rawBattles.map((b: any) => {
        // Determine result relative to the player
        // The API usually returns team[0] as the player being queried
        const team = b.team[0];
        const opponent = b.opponent[0];

        // Extract card names (API returns objects with name, id, etc.)
        const deckCards = team.cards.map((c: any) => c.name);
        const opponentDeck = opponent.cards.map((c: any) => c.name);

        let result = 'draw';
        if (team.crowns > opponent.crowns) result = 'win';
        else if (team.crowns < opponent.crowns) result = 'loss';

        return {
          playerTag: player.tag, // Enforce tag from player loop (API doesn't always have it in root)
          battleTime: b.battleTime,
          deckCards,
          opponentDeck,
          result,
          trophies: team.startingTrophies || 0,
        };
      });

      if (cleanBattles.length > 0) {
        const count = processBattles(cleanBattles);
        totalIngested += count;
      }
      // Polite delay
      await new Promise((r) => setTimeout(r, 200));
    }

    logger.info(
      `[Worker] Job complete. Ingested ${totalIngested} new battles from ${players.length} players.`,
    );
  };

  // Run immediately on start
  runJob();

  // Run every hour (3600000 ms)
  setInterval(runJob, 60 * 60 * 1000);
}

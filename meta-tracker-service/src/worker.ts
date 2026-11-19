import { logger } from 'shared';
import { normalizeBattleLog } from './services/battleNormalizer';
import { getFromClashDataService, playerPath } from './services/clashDataClient';
import { processBattles } from './services/ingestionService';

const RUN_INTERVAL_MS = 60 * 60 * 1000; // every hour
const POLITE_DELAY_MS = 200; // between two players, to spare the Clash Royale API quota

interface RankedPlayer {
  tag: string;
}

let running = false;

/**
 * One ingestion run over the Path of Legend ranking. A failing player is logged and skipped, so
 * one bad battle log never stops the run.
 */
export async function runIngestion(): Promise<void> {
  const started = Date.now();
  const ranking = await getFromClashDataService<{ items?: RankedPlayer[] }>(
    '/locations/global/pathoflegend/players',
  );
  const players = (ranking.items ?? []).slice(0, 1000);
  logger.info(`[Worker] Found ${players.length} top players. Processing...`);

  const totals = { ingested: 0, duplicates: 0, invalid: 0, skipped: 0, failedPlayers: 0 };

  for (const player of players) {
    try {
      const rawLog = await getFromClashDataService<unknown>(playerPath(player.tag, '/battles'));
      const { battles, skipped } = normalizeBattleLog(player.tag, rawLog);
      const report = processBattles(battles);
      totals.ingested += report.ingested;
      totals.duplicates += report.duplicates;
      totals.invalid += report.invalid;
      totals.skipped += skipped;
    } catch (error) {
      totals.failedPlayers++;
      logger.warn(`[Worker] Battles of ${player.tag} not ingested`, error);
    }
    await new Promise((resolve) => setTimeout(resolve, POLITE_DELAY_MS));
  }

  logger.info('[Worker] Job complete', {
    players: players.length,
    ...totals,
    durationMs: Date.now() - started,
  });
}

/**
 * Runs the ingestion now, then every hour. A run still in progress when the next one is due is
 * not doubled: the next one is skipped (a run over 1000 players can last several minutes, more if
 * the Clash Royale API is slow).
 */
export function startWorker() {
  logger.info('Starting Meta Tracker Background Worker...');

  const safeRun = async () => {
    if (running) {
      logger.warn('[Worker] Previous run still in progress, this run is skipped');
      return;
    }
    running = true;
    try {
      await runIngestion();
    } catch (error) {
      // Ranking unavailable or database error: logged, the next run retries. Left unhandled, the
      // rejection would stop the whole service (see installProcessHandlers).
      logger.error('[Worker] Ingestion job failed', error);
    } finally {
      running = false;
    }
  };

  void safeRun();
  setInterval(() => void safeRun(), RUN_INTERVAL_MS).unref();
}

// Calls to clash-data-service: time-limited, with the request id, and turned into the shared
// errors (404 PlayerNotFound, 503/504 when it is unavailable or too slow).

import fetch from 'node-fetch';
import {
  NotFoundError,
  TIMEOUTS_MS,
  UpstreamError,
  isTimeoutError,
  requestIdHeaders,
  timeoutFromEnv,
} from 'shared';

const DATA_SERVICE_URL = process.env.CLASH_DATA_SERVICE_URL || 'http://clash-data-service:3004';
const CALL_TIMEOUT_MS = timeoutFromEnv('SERVICE_CALL_TIMEOUT_MS', TIMEOUTS_MS.serviceCall);

export async function getFromClashDataService<T>(path: string): Promise<T> {
  let response;
  try {
    response = await fetch(`${DATA_SERVICE_URL}${path}`, {
      headers: requestIdHeaders(),
      signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
    });
  } catch (error) {
    throw new UpstreamError(isTimeoutError(error) ? 504 : 503, undefined, {
      internalDetails: { service: 'clash-data-service', path },
      cause: error,
    });
  }

  if (response.status === 404) {
    throw new NotFoundError('Aucun joueur ne correspond à ce tag.', { code: 'PlayerNotFound' });
  }
  if (!response.ok) {
    // 503 and 504 keep their meaning (Clash Royale down or too slow); anything else is a 502.
    const status = response.status === 503 || response.status === 504 ? response.status : 502;
    throw new UpstreamError(status, undefined, {
      internalDetails: { service: 'clash-data-service', path, status: response.status },
    });
  }
  return (await response.json()) as T;
}

export function playerPath(tag: string, suffix = ''): string {
  return `/players/${encodeURIComponent(tag)}${suffix}`;
}

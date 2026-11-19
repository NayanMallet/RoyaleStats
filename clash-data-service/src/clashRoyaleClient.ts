import fetch from 'node-fetch';
import {
  AppError,
  NotFoundError,
  RateLimitedError,
  TIMEOUTS_MS,
  UpstreamError,
  ValidationError,
  isTimeoutError,
  logger,
  timeoutFromEnv,
} from 'shared';

const API_KEY = process.env.CLASH_ROYALE_API_KEY;
const BASE_URL = process.env.CLASH_ROYALE_BASE_URL || 'https://api.clashroyale.com/v1';
// Shorter than the Gateway's limit, so that a slow Clash Royale API answers 504 from here.
const TIMEOUT_MS = timeoutFromEnv('CLASH_API_TIMEOUT_MS', TIMEOUTS_MS.externalApi);

// Public message of every "Clash Royale cannot answer" case. The `error` code tells them apart:
// ClashApiMisconfigured (our key, to fix on the server), ClashApiUnavailable (their side or the
// network), ClashApiTimeout (too slow) and RateLimited (quota).
const UNAVAILABLE_MESSAGE = 'Les données Clash Royale sont momentanément indisponibles.';

if (!API_KEY) {
  logger.warn('CLASH_ROYALE_API_KEY not set - Clash Data Service will not work properly');
}

export interface ClashRequestOptions {
  /** Error thrown when the resource does not exist, e.g. a PlayerNotFound with its own message. */
  notFound?: () => AppError;
}

/**
 * Clash Royale API status → error for our clients. The API's own body is logged, never sent:
 * it can name our IP address or API key problems.
 */
export function errorForClashStatus(
  status: number,
  options: ClashRequestOptions = {},
  internalDetails?: Record<string, unknown>,
): AppError {
  const details = { internalDetails: { clashStatus: status, ...internalDetails } };

  switch (status) {
    case 400:
      return new ValidationError('La requête envoyée à Clash Royale est invalide.', details);
    case 404:
      return (
        options.notFound?.() ?? new NotFoundError('Ressource Clash Royale introuvable.', details)
      );
    case 403:
      // Invalid API key, or key bound to another IP address (it changes with the network): a
      // server configuration problem, not an outage. Same message, distinct code and log.
      return new UpstreamError(503, UNAVAILABLE_MESSAGE, {
        ...details,
        code: 'ClashApiMisconfigured',
      });
    case 429:
      return new RateLimitedError(undefined, details);
    case 503:
      return new UpstreamError(
        503,
        'Clash Royale est en maintenance, réessayez plus tard.',
        details,
      );
    default:
      return new UpstreamError(502, UNAVAILABLE_MESSAGE, {
        ...details,
        code: 'ClashApiUnavailable',
      });
  }
}

/** No answer from the Clash Royale API: too slow (504) or unreachable (503). */
export function errorForClashFailure(error: unknown, endpoint: string): UpstreamError {
  if (isTimeoutError(error)) {
    return new UpstreamError(
      504,
      'Clash Royale met trop de temps à répondre, réessayez plus tard.',
      {
        code: 'ClashApiTimeout',
        internalDetails: { endpoint, timeoutMs: TIMEOUT_MS },
        cause: error,
      },
    );
  }
  return new UpstreamError(503, UNAVAILABLE_MESSAGE, {
    code: 'ClashApiUnavailable',
    internalDetails: { endpoint },
    cause: error,
  });
}

export async function fetchFromClashAPI<T>(
  endpoint: string,
  options: ClashRequestOptions = {},
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  logger.debug(`Calling Clash Royale API: ${endpoint}`);

  let response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const failure = errorForClashFailure(error, endpoint);
    logger.warn(`Clash Royale API did not answer on ${endpoint}`, {
      error: failure.code,
      timeoutMs: TIMEOUT_MS,
    });
    throw failure;
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const error = errorForClashStatus(response.status, options, { endpoint });
    const log = response.status === 404 ? logger.debug : logger.warn;
    log(`Clash Royale API answered ${response.status} on ${endpoint}`, {
      clashStatus: response.status,
      clashBody: body.slice(0, 500),
    });
    if (response.status === 403) {
      logger.error(
        'Clash Royale API refused the key (403): check CLASH_ROYALE_API_KEY and the IP address it is bound to',
      );
    }
    throw error;
  }

  return (await response.json()) as T;
}

import fetch from 'node-fetch';
import {
  AppError,
  NotFoundError,
  RateLimitedError,
  UpstreamError,
  ValidationError,
  logger,
} from 'shared';

const API_KEY = process.env.CLASH_ROYALE_API_KEY;
const BASE_URL = process.env.CLASH_ROYALE_BASE_URL || 'https://api.clashroyale.com/v1';

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
      // Invalid API key, or key bound to another IP address (it changes with the network).
      return new UpstreamError(503, 'Les données Clash Royale sont momentanément indisponibles.', {
        ...details,
        code: 'ClashApiUnavailable',
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
      return new UpstreamError(502, undefined, details);
  }
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
    });
  } catch (error) {
    throw new UpstreamError(503, 'Les données Clash Royale sont momentanément indisponibles.', {
      code: 'ClashApiUnavailable',
      cause: error,
    });
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

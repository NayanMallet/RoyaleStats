// Time limits of outgoing calls. Each hop answers before the one above it gives up:
//   front 10 s > Gateway 10 s > link-service → clash-data-service 9 s > clash-data-service → Clash Royale 8 s
// so the user always gets a precise error (504 from the right service) instead of a generic one.

export const TIMEOUTS_MS = {
  /** API Gateway → every service (http-proxy-middleware). */
  gatewayProxy: 10_000,
  /** One service → another service of the stack. */
  serviceCall: 9_000,
  /** clash-data-service → Clash Royale API, meta-tracker worker → clash-data-service. */
  externalApi: 8_000,
} as const;

/** A time limit from the environment (milliseconds), or the default when unset or invalid. */
export function timeoutFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/** True when a fetch was aborted by its time limit (native fetch or node-fetch v2). */
export function isTimeoutError(error: unknown): boolean {
  const { name, type } = (error ?? {}) as { name?: unknown; type?: unknown };
  return name === 'TimeoutError' || name === 'AbortError' || type === 'aborted';
}

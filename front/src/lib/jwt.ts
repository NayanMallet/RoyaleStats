// Reads the expiry of a session token (JWT) without verifying it: only the server can verify a
// token. The front uses the expiry to drop a session it knows is over without a round trip.

/** Expiry of the token in ms since epoch; null when the token is not a readable JWT or has none. */
export function tokenExpiresAt(token: string): number | null {
  const payload = token.split('.')[1]
  if (!payload) return null
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const exp = (JSON.parse(json) as { exp?: unknown }).exp
    return typeof exp === 'number' ? exp * 1000 : null
  } catch {
    return null
  }
}

/** True only when the token says it is expired; an unreadable token is left to the server. */
export function isTokenExpired(token: string, now = Date.now()): boolean {
  const expiresAt = tokenExpiresAt(token)
  return expiresAt !== null && expiresAt <= now
}

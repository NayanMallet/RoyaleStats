import { describe, expect, it } from 'vitest'
import { isTokenExpired, tokenExpiresAt } from '../jwt'

/** Unsigned JWT with the given payload: the front never checks the signature. */
const jwt = (payload: object) =>
  `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify(payload)).replace(/=+$/, '')}.signature`

describe('session token expiry', () => {
  it('reads the expiry of a JWT', () => {
    expect(tokenExpiresAt(jwt({ userId: 1, exp: 1_800_000_000 }))).toBe(1_800_000_000_000)
  })

  it('reads a base64url payload', () => {
    // "é" in the name gives "-" or "_" characters in base64url.
    const payload = btoa(JSON.stringify({ name: 'Gérard ??>', exp: 1 }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    expect(tokenExpiresAt(`h.${payload}.s`)).toBe(1000)
  })

  it.each(['not-a-jwt', 'a.b.c', 'a.%%%.c', jwt({ userId: 1 })])(
    'has no expiry for %j',
    (token) => {
      expect(tokenExpiresAt(token)).toBeNull()
    },
  )

  it('tells an expired token, and leaves an unreadable one to the server', () => {
    const now = 1_800_000_000_000
    expect(isTokenExpired(jwt({ exp: 1_799_999_999 }), now)).toBe(true)
    expect(isTokenExpired(jwt({ exp: 1_800_000_001 }), now)).toBe(false)
    expect(isTokenExpired('expired.e2e.token', now)).toBe(false)
  })
})

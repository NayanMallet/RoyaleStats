import { describe, expect, it } from 'vitest'
import { safeRedirect } from '../redirect'

describe('safeRedirect', () => {
  it('keeps an internal path, with its query', () => {
    expect(safeRedirect('/profile?tab=link')).toBe('/profile?tab=link')
  })

  it.each([
    ['another site', 'https://evil.example'],
    ['a protocol-relative URL', '//evil.example'],
    ['a missing value', undefined],
    ['several values', ['/a', '/b']],
  ])('falls back to the home page for %s', (_label, target) => {
    expect(safeRedirect(target)).toBe('/')
  })
})

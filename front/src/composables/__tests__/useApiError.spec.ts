import { describe, expect, it } from 'vitest'
import { describeApiError } from '../useApiError'
import { ApiError, NetworkError } from '@/services/http'

describe('describeApiError', () => {
  it('shows the business message of a 409 and the incident code', () => {
    const shown = describeApiError(
      new ApiError(409, 'Un compte existe déjà avec cet email.', {
        code: 'ConflictError',
        requestId: 'req-1',
      }),
    )

    expect(shown).toMatchObject({
      message: 'Un compte existe déjà avec cet email.',
      incidentCode: 'req-1',
      retryable: false,
    })
  })

  it.each([
    [500, 'Une erreur interne est survenue.'],
    [502, 'Service momentanément indisponible, réessayez dans un instant.'],
    [503, 'Service momentanément indisponible, réessayez dans un instant.'],
    [504, 'Service momentanément indisponible, réessayez dans un instant.'],
  ])('offers to retry a %i', (status, message) => {
    const shown = describeApiError(new ApiError(status, 'internal detail'))

    expect(shown.message).toBe(message)
    expect(shown.retryable).toBe(true)
  })

  it('asks to wait after a 429', () => {
    expect(describeApiError(new ApiError(429, 'x')).message).toBe(
      'Trop de requêtes, réessayez dans quelques secondes.',
    )
  })

  it('names an unreachable service on a network error or a timeout', () => {
    expect(describeApiError(new NetworkError(false))).toMatchObject({
      title: 'Service injoignable',
      retryable: true,
    })
    expect(describeApiError(new NetworkError(true)).message).toContain('ne répond pas')
  })

  it('never shows a technical "HTTP error" message', () => {
    expect(describeApiError(new ApiError(400, 'HTTP error 400')).message).toBe(
      'La requête n’a pas pu aboutir.',
    )
  })

  it('falls back to a generic message for anything else', () => {
    expect(describeApiError(new TypeError('x is undefined')).message).toBe(
      'Une erreur inattendue est survenue.',
    )
  })
})

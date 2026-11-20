import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, NetworkError, REQUEST_TIMEOUT_MS, http, setUnauthorizedHandler } from '../http'

function mockFetch(status: number, body?: unknown, headers: Record<string, string> = {}) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: async () => {
      if (body === undefined) throw new SyntaxError('Unexpected end of JSON input')
      return body
    },
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function failure(promise: Promise<unknown>) {
  return promise.then(
    () => {
      throw new Error('The request should have failed')
    },
    (error: unknown) => error,
  )
}

describe('http client', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    setUnauthorizedHandler(undefined)
  })

  it('returns the parsed JSON body on success', async () => {
    mockFetch(200, { id: 1, name: 'Karim' })

    await expect(http.get('/api/users/me')).resolves.toEqual({ id: 1, name: 'Karim' })
  })

  it('returns undefined on 204 No Content', async () => {
    mockFetch(204)

    await expect(http.delete('/api/users/me')).resolves.toBeUndefined()
  })

  it('never sends the session token with public data, nor expires the session on a 401', async () => {
    localStorage.setItem('auth_token', 'secret-token')
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    const fetchMock = mockFetch(401, {
      error: 'AuthenticationError',
      message: 'x',
      statusCode: 401,
    })

    await failure(http.getPublic('/api/royaleapi/players/level/16'))

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>
    expect(headers.Authorization).toBeUndefined()
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('sends the bearer token when the user is logged in', async () => {
    localStorage.setItem('auth_token', 'abc123')
    const fetchMock = mockFetch(200, {})

    await http.get('/api/users/me')

    const [, init] = fetchMock.mock.calls[0]!
    expect(init.headers.Authorization).toBe('Bearer abc123')
  })

  it('serializes the body as JSON on POST', async () => {
    const fetchMock = mockFetch(201, {})

    await http.post('/api/users/register', { email: 'a@b.c' })

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/users/register')
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"email":"a@b.c"}')
  })

  it('keeps the business message, code and requestId of a 409', async () => {
    mockFetch(409, {
      error: 'ConflictError',
      message: 'Un compte existe déjà avec cet email.',
      statusCode: 409,
      requestId: 'req-409',
    })

    const error = await failure(http.post('/api/users/register', {}))

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 409,
      code: 'ConflictError',
      message: 'Un compte existe déjà avec cet email.',
      requestId: 'req-409',
    })
  })

  it('keeps the requestId of a 500 and its server stack when the API sends one (DEV)', async () => {
    mockFetch(500, {
      error: 'InternalServerError',
      message: 'Une erreur interne est survenue.',
      statusCode: 500,
      requestId: 'req-500',
      stack: 'Error: Boom\n    at handler',
    })

    const error = (await failure(http.get('/api/meta/snapshot'))) as ApiError

    expect(error.status).toBe(500)
    expect(error.requestId).toBe('req-500')
    expect(error.serverStack).toContain('Error: Boom')
  })

  it('reads the requestId from the header when the body is not JSON (nginx 502 page)', async () => {
    mockFetch(502, undefined, { 'x-request-id': 'req-header' })

    const error = (await failure(http.get('/api/clash/cards'))) as ApiError

    expect(error).toMatchObject({ status: 502, code: 'Http502', requestId: 'req-header' })
  })

  it('throws a NetworkError when the network is down', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const error = await failure(http.get('/api/users/me'))

    expect(error).toBeInstanceOf(NetworkError)
    expect((error as NetworkError).timedOut).toBe(false)
  })

  it(`gives up after ${REQUEST_TIMEOUT_MS / 1000} s with a timed out NetworkError`, async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            )
          }),
      ),
    )

    const pending = failure(http.get('/api/clash/players/%23ABC'))
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS)
    const error = await pending

    expect(error).toBeInstanceOf(NetworkError)
    expect((error as NetworkError).timedOut).toBe(true)
  })

  it('reports an expired session when a request sent with a token answers 401', async () => {
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    localStorage.setItem('auth_token', 'expired')
    mockFetch(401, { error: 'AuthenticationError', message: 'Session expirée.', statusCode: 401 })

    await failure(http.get('/api/users/me'))

    expect(onUnauthorized).toHaveBeenCalledOnce()
  })

  it('does not treat a wrong password (401 without token) as an expired session', async () => {
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    mockFetch(401, { error: 'AuthenticationError', message: 'Email ou mot de passe incorrect.' })

    await failure(http.post('/api/users/login', {}))

    expect(onUnauthorized).not.toHaveBeenCalled()
  })
})

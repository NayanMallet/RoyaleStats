import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpError } from '../http'

function mockFetch(status: number, body?: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('http client', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the parsed JSON body on success', async () => {
    mockFetch(200, { id: 1, name: 'Karim' })

    await expect(http.get('/api/users/me')).resolves.toEqual({ id: 1, name: 'Karim' })
  })

  it('returns undefined on 204 No Content', async () => {
    mockFetch(204)

    await expect(http.delete('/api/users/me')).resolves.toBeUndefined()
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

  it('throws an HttpError carrying the status code on failure', async () => {
    mockFetch(409, { error: 'ConflictError', message: 'User with this email already exists' })

    const error = await http.post('/api/users/register', {}).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(HttpError)
    expect((error as HttpError).status).toBe(409)
  })
})

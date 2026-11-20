import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { toast } from 'vue-sonner'
import { http, setUnauthorizedHandler } from '@/services/http'
import { useAuthStore } from '@/stores/auth'
import { SESSION_EXPIRED_MESSAGE, installSession } from '../session'

vi.mock('vue-sonner', () => ({ toast: { warning: vi.fn(), error: vi.fn() } }))

const user = { id: 1, name: 'Karim', email: 'karim@example.com', created_at: '2026-01-01' }
const jwt = (exp: number) => `h.${btoa(JSON.stringify({ userId: 1, exp }))}.s`
const now = () => Math.floor(Date.now() / 1000)

function storeSession(token = jwt(now() + 3600)) {
  localStorage.setItem('auth_token', token)
  localStorage.setItem('auth_user', JSON.stringify(user))
  localStorage.setItem('linked_player_tag', '#2PP8VJ9Q')
}

/** fetch answering /api/users/me with this status, and 401 to /api/link calls. */
function mockApi(meStatus: number) {
  const fetchMock = vi.fn(async (input: RequestInfo) => {
    const status = String(input).includes('/users/me') ? meStatus : 401
    return {
      ok: status < 400,
      status,
      headers: new Headers(),
      json: async () =>
        status < 400 ? user : { error: 'AuthenticationError', message: 'x', statusCode: status },
    }
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function startApp(path: string): Promise<Router> {
  const Page = { render: () => null }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: Page },
      { path: '/login', name: 'login', component: Page },
      { path: '/profile', name: 'profile', component: Page, meta: { requiresAuth: true } },
    ],
  })
  installSession(router)
  await router.push(path)
  await router.isReady()
  // Let the start-up check settle.
  await new Promise((resolve) => setTimeout(resolve))
  return router
}

describe('session lifecycle', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.mocked(toast.warning).mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    setUnauthorizedHandler(undefined)
  })

  it('keeps a valid session at start-up and refreshes the user', async () => {
    storeSession()
    setActivePinia(createPinia())
    const fetchMock = mockApi(200)

    const router = await startApp('/profile')

    expect(router.currentRoute.value.name).toBe('profile')
    expect(useAuthStore().isAuthenticated).toBe(true)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/users/me')
  })

  it('purges a session the API refuses at start-up and asks to log in again', async () => {
    storeSession()
    setActivePinia(createPinia())
    mockApi(401)

    const router = await startApp('/profile')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('login'))

    expect(router.currentRoute.value.query.redirect).toBe('/profile')
    expect(localStorage.getItem('auth_token')).toBeNull()
    expect(localStorage.getItem('linked_player_tag')).toBeNull()
    expect(toast.warning).toHaveBeenCalledWith(SESSION_EXPIRED_MESSAGE)
  })

  it('drops an expired token before showing a private page, without calling the API', async () => {
    storeSession(jwt(now() - 60))
    setActivePinia(createPinia())
    const fetchMock = mockApi(200)

    const router = await startApp('/profile')

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/profile')
    expect(useAuthStore().isAuthenticated).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('drops a token that expires while the app is open, at the next navigation', async () => {
    storeSession()
    setActivePinia(createPinia())
    const fetchMock = mockApi(200)
    const router = await startApp('/')
    fetchMock.mockClear()

    useAuthStore().token = jwt(now() - 1)
    await router.push('/profile')

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/profile')
    expect(localStorage.getItem('auth_token')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('on a public page, a 401 purges the session without leaving the page', async () => {
    storeSession()
    setActivePinia(createPinia())
    mockApi(200)
    const router = await startApp('/')

    await http.get('/api/link/1').catch(() => undefined)

    expect(useAuthStore().isAuthenticated).toBe(false)
    expect(router.currentRoute.value.name).toBe('home')
    expect(toast.warning).toHaveBeenCalledWith(SESSION_EXPIRED_MESSAGE)
  })

  it('follows a logout made in another tab', async () => {
    storeSession()
    setActivePinia(createPinia())
    mockApi(200)
    const router = await startApp('/profile')

    localStorage.clear()
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'auth_token', storageArea: localStorage }),
    )

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('login'))
    expect(useAuthStore().user).toBeNull()
  })
})

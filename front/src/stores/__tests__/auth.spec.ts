import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '../auth'

const user = { id: 1, name: 'Karim', email: 'karim@example.com', created_at: '2026-01-01' }
const jwt = (exp: number) => `h.${btoa(JSON.stringify({ userId: 1, exp }))}.s`
const inOneHour = () => Math.floor(Date.now() / 1000) + 3600

function storeSession(token = jwt(inOneHour())) {
  localStorage.setItem('auth_token', token)
  localStorage.setItem('auth_user', JSON.stringify(user))
  localStorage.setItem('linked_player_tag', '#2PP8VJ9Q')
}

function mockMe(status: number, body: unknown = user) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status < 400,
    status,
    headers: new Headers(),
    json: async () => body,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('auth store', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads the stored session at start-up', () => {
    storeSession()
    setActivePinia(createPinia())
    const store = useAuthStore()

    expect(store.isAuthenticated).toBe(true)
    expect(store.user?.name).toBe('Karim')
    expect(store.linkedPlayerTag).toBe('#2PP8VJ9Q')
  })

  it('logout removes the token, the user and the linked tag, in memory and in storage', () => {
    storeSession()
    setActivePinia(createPinia())
    const store = useAuthStore()

    store.logout()

    expect([store.token, store.user, store.linkedPlayerTag]).toEqual([null, null, null])
    expect(Object.keys(localStorage)).toEqual([])
    // The next user does not get the previous linked tag back after a reload.
    setActivePinia(createPinia())
    expect(useAuthStore().linkedPlayerTag).toBeNull()
  })

  describe('verifySession', () => {
    it('refreshes the user from the API', async () => {
      storeSession()
      setActivePinia(createPinia())
      mockMe(200, { ...user, name: 'Karim B.' })

      await expect(useAuthStore().verifySession()).resolves.toBe(true)
      expect(useAuthStore().user?.name).toBe('Karim B.')
      expect(JSON.parse(localStorage.getItem('auth_user')!).name).toBe('Karim B.')
    })

    it('answers false on a 401', async () => {
      storeSession()
      setActivePinia(createPinia())
      mockMe(401, { error: 'AuthenticationError', message: 'Session expirée', statusCode: 401 })

      await expect(useAuthStore().verifySession()).resolves.toBe(false)
    })

    it('keeps the session when the API cannot be reached', async () => {
      storeSession()
      setActivePinia(createPinia())
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

      await expect(useAuthStore().verifySession()).resolves.toBe(true)
    })

    it('answers false without calling the API when the token is expired', async () => {
      storeSession(jwt(Math.floor(Date.now() / 1000) - 60))
      setActivePinia(createPinia())
      const fetchMock = mockMe(200)

      expect(useAuthStore().hasExpiredToken()).toBe(true)
      await expect(useAuthStore().verifySession()).resolves.toBe(false)
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  it('follows the storage written by another tab', () => {
    storeSession()
    setActivePinia(createPinia())
    const store = useAuthStore()

    localStorage.clear()
    store.syncFromStorage()

    expect(store.isAuthenticated).toBe(false)
    expect(store.linkedPlayerTag).toBeNull()
  })
})

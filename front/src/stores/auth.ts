import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { authService, type User } from '@/services/auth.service'
import { ApiError } from '@/services/http'
import { isTokenExpired } from '@/lib/jwt'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(authService.getUser())
  const token = ref<string | null>(authService.getToken())
  const linkedPlayerTag = ref<string | null>(authService.getLinkedPlayerTag())

  const isAuthenticated = computed(() => !!token.value)
  const hasLinkedPlayer = computed(() => !!linkedPlayerTag.value)

  function setAuth(authUser: User, authToken: string) {
    user.value = authUser
    token.value = authToken
  }

  /** Ends the session: token, user and linked tag, in memory and in the browser storage. */
  function logout() {
    user.value = null
    token.value = null
    linkedPlayerTag.value = null
    authService.clearSession()
  }

  function updateUser(updatedUser: User) {
    user.value = updatedUser
    authService.saveUser(updatedUser)
  }

  function setLinkedPlayerTag(tag: string | null) {
    linkedPlayerTag.value = tag
    authService.saveLinkedPlayerTag(tag)
  }

  /** True when the stored token says it is expired: the session is over without asking the API. */
  function hasExpiredToken(): boolean {
    return !!token.value && isTokenExpired(token.value)
  }

  /**
   * Checks the stored session with the API (GET /users/me) and refreshes the user. A 401 is
   * handled by the session expiry handler (lib/session.ts); a network failure keeps the session,
   * the next call will tell. Returns false when the session is over.
   */
  async function verifySession(): Promise<boolean> {
    if (!token.value) return false
    if (hasExpiredToken()) return false
    try {
      updateUser(await authService.getMe())
      return true
    } catch (error) {
      return !(error instanceof ApiError && error.status === 401)
    }
  }

  /**
   * Another tab logged in or out: the browser storage changed, the memory follows. Nothing is
   * written back, the other tab already did it.
   */
  function syncFromStorage() {
    token.value = authService.getToken()
    user.value = authService.getUser()
    linkedPlayerTag.value = authService.getLinkedPlayerTag()
  }

  return {
    user,
    token,
    linkedPlayerTag,
    isAuthenticated,
    hasLinkedPlayer,
    setAuth,
    logout,
    updateUser,
    setLinkedPlayerTag,
    hasExpiredToken,
    verifySession,
    syncFromStorage,
  }
})

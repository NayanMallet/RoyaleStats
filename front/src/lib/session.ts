// Session lifecycle in one place (RST-27): checked at start-up, at each navigation and on every
// 401, purged on logout or expiry, and kept in step between the tabs of the browser.
//
// A session ends when the API answers 401 to a request sent with the token, when the token says
// it is expired, or when another tab logs out. Its token, user and linked tag are then removed;
// on a private page the user is sent to the login page, which brings them back afterwards.

import type { Router } from 'vue-router'
import { toast } from 'vue-sonner'
import { SESSION_KEYS } from '@/services/auth.service'
import { setUnauthorizedHandler } from '@/services/http'
import { useAuthStore } from '@/stores/auth'

export const SESSION_EXPIRED_MESSAGE = 'Votre session a expiré, reconnectez-vous.'

/** Login page, with the page to come back to. */
function loginRoute(router: Router) {
  return { name: 'login', query: { redirect: router.currentRoute.value.fullPath } }
}

/** Purges an expired session; on a private page, asks to log in again. */
export function expireSession(router: Router) {
  const authStore = useAuthStore()
  if (!authStore.isAuthenticated) return
  authStore.logout()

  const current = router.currentRoute.value
  if (current.name === 'login') return
  toast.warning(SESSION_EXPIRED_MESSAGE)
  if (current.meta.requiresAuth) void router.push(loginRoute(router))
}

export function installSession(router: Router) {
  const authStore = useAuthStore()

  // A request sent with the token answered 401: revoked or expired session.
  setUnauthorizedHandler(() => expireSession(router))

  // A token that is already expired is dropped before the page that needs it is shown.
  router.beforeEach((to) => {
    if (!authStore.hasExpiredToken()) return
    authStore.logout()
    toast.warning(SESSION_EXPIRED_MESSAGE)
    if (to.meta.requiresAuth) return { name: 'login', query: { redirect: to.fullPath } }
  })

  // Start-up: the stored session is checked with the API, and the user refreshed.
  void router.isReady().then(async () => {
    if (!(await authStore.verifySession()) && authStore.isAuthenticated) expireSession(router)
  })

  // Another tab logged in or out.
  window.addEventListener('storage', (event) => {
    const keys: (string | null)[] = Object.values(SESSION_KEYS)
    if (event.storageArea !== localStorage || (!keys.includes(event.key) && event.key !== null))
      return
    const wasAuthenticated = authStore.isAuthenticated
    authStore.syncFromStorage()
    if (
      wasAuthenticated &&
      !authStore.isAuthenticated &&
      router.currentRoute.value.meta.requiresAuth
    ) {
      void router.push(loginRoute(router))
    }
  })
}

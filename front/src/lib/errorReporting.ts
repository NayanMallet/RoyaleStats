// Errors no component handled: Vue errors outside the ErrorBoundary, script errors and
// promises nobody awaited. They are logged, and the user gets a toast for API errors.
// Sending them to an external service (Sentry…) is a possible next step, out of scope for now.

import type { App } from 'vue'
import type { Router } from 'vue-router'
import { toast } from 'vue-sonner'
import { describeApiError } from '@/composables/useApiError'
import { ApiError, NetworkError, setUnauthorizedHandler } from '@/services/http'
import { useAuthStore } from '@/stores/auth'

export function installErrorReporting(app: App) {
  app.config.errorHandler = (error, instance, info) => {
    const component = instance?.$options.name ?? instance?.$options.__name ?? 'App'
    console.error(`[Vue] ${component} failed (${info})`, error)
    toast.error('Une erreur inattendue est survenue.')
  }

  window.addEventListener('error', (event) => {
    console.error('[window] Uncaught error', event.error ?? event.message)
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    console.error('[window] Unhandled promise rejection', reason)
    if (reason instanceof ApiError || reason instanceof NetworkError) {
      // 401s are handled by the session expiry below: no second message.
      if (reason instanceof ApiError && reason.status === 401) return
      const shown = describeApiError(reason)
      toast.error(shown.message, {
        description: shown.incidentCode ? `Code incident : ${shown.incidentCode}` : undefined,
      })
    }
  })
}

/** A request with a session token answered 401: purge the session and ask to log in again. */
export function installSessionExpiry(router: Router) {
  setUnauthorizedHandler(() => {
    const authStore = useAuthStore()
    if (!authStore.isAuthenticated) return
    authStore.logout()

    const current = router.currentRoute.value
    if (current.name === 'login') return
    toast.warning('Votre session a expiré, reconnectez-vous.')
    router.push({ name: 'login', query: { redirect: current.fullPath } })
  })
}

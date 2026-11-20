// Errors no component handled: Vue errors outside the ErrorBoundary, script errors and
// promises nobody awaited. They are logged, and the user gets a toast for API errors.
// Sending them to an external service (Sentry…) is a possible next step, out of scope for now.

import type { App } from 'vue'
import { toast } from 'vue-sonner'
import { describeApiError } from '@/composables/useApiError'
import { ApiError, NetworkError } from '@/services/http'

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
      // 401s are handled by the session expiry (lib/session.ts): no second message.
      if (reason instanceof ApiError && reason.status === 401) return
      const shown = describeApiError(reason)
      toast.error(shown.message, {
        description: shown.incidentCode ? `Code incident : ${shown.incidentCode}` : undefined,
      })
    }
  })
}

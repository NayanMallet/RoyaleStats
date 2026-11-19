// Turns any error caught around an API call into what the user sees, following the
// "HTTP → UX" table of the Epic RST-32 (docs/ERROR-HANDLING.md).
//
//   const { describe, notify } = useApiError()
//   try { … } catch (error) { notify(error) }          // toast
//   const shown = describe(error)                       // inline: <ErrorState v-bind="shown" />

import { toast } from 'vue-sonner'
import { ApiError, NetworkError } from '@/services/http'

export interface DisplayedError {
  title: string
  message: string
  /** requestId of the failed request, shown as "code incident". */
  incidentCode?: string
  /** 5xx, timeout and network errors: offer a "Réessayer" button. */
  retryable: boolean
  /** Development only: server or client stack. */
  debug?: string
}

const SERVICE_UNAVAILABLE = 'Service momentanément indisponible, réessayez dans un instant.'

export function describeApiError(error: unknown): DisplayedError {
  const debug = import.meta.env.DEV ? stackOf(error) : undefined

  if (error instanceof NetworkError) {
    return {
      title: 'Service injoignable',
      message: error.timedOut
        ? 'Le service ne répond pas. Vérifiez votre connexion puis réessayez.'
        : 'Connexion impossible. Vérifiez votre connexion puis réessayez.',
      retryable: true,
      debug,
    }
  }

  if (error instanceof ApiError) {
    const incidentCode = error.requestId
    const status = error.status

    if (status === 401) {
      return {
        title: 'Session expirée',
        message: 'Votre session a expiré, reconnectez-vous.',
        incidentCode,
        retryable: false,
        debug,
      }
    }
    if (status === 403) {
      return {
        title: 'Action non autorisée',
        message: 'Action non autorisée.',
        incidentCode,
        retryable: false,
        debug,
      }
    }
    if (status === 429) {
      return {
        title: 'Trop de requêtes',
        message: 'Trop de requêtes, réessayez dans quelques secondes.',
        incidentCode,
        retryable: true,
        debug,
      }
    }
    if (status >= 500) {
      const unavailable = status >= 502
      return {
        title: unavailable ? 'Service indisponible' : 'Erreur interne',
        message: unavailable ? SERVICE_UNAVAILABLE : 'Une erreur interne est survenue.',
        incidentCode,
        retryable: true,
        debug,
      }
    }
    // 400, 404, 409…: the back end sends a business message in French.
    const hasBusinessMessage = !error.message.startsWith('HTTP error')
    return {
      title: status === 404 ? 'Introuvable' : 'Action impossible',
      message: hasBusinessMessage ? error.message : 'La requête n’a pas pu aboutir.',
      incidentCode,
      retryable: false,
      debug,
    }
  }

  return {
    title: 'Erreur inattendue',
    message: 'Une erreur inattendue est survenue.',
    retryable: true,
    debug,
  }
}

function stackOf(error: unknown): string | undefined {
  if (error instanceof ApiError && error.serverStack) return error.serverStack
  return error instanceof Error ? error.stack : undefined
}

export function useApiError() {
  function notify(error: unknown) {
    const shown = describeApiError(error)
    toast.error(shown.message, {
      description: shown.incidentCode ? `Code incident : ${shown.incidentCode}` : undefined,
    })
    return shown
  }

  return { describe: describeApiError, notify }
}

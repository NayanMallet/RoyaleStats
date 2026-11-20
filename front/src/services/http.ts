// HTTP client of the front. Every failure becomes a typed error:
// - ApiError: the API answered with an error status. Its fields follow the error contract of the
//   back end (docs/ERROR-HANDLING.md): code, message, requestId, details.
// - NetworkError: no answer at all (network down, Gateway unreachable, timeout after 10 s).
// Turning them into a message for the user is the job of useApiError().

export const REQUEST_TIMEOUT_MS = 10_000

/** Body of an error answered by the API Gateway or a service. */
export interface ApiErrorBody {
  error: string
  message: string
  statusCode: number
  requestId?: string
  details?: unknown
  stack?: string
}

export class ApiError extends Error {
  readonly status: number
  /** Stable machine-readable code: ValidationError, PlayerNotFound, ServiceUnavailable… */
  readonly code: string
  /** Incident code to show to the user and to look for in the server logs. */
  readonly requestId?: string
  readonly details?: unknown
  /** Server stack, sent in development only. */
  readonly serverStack?: string

  constructor(
    status: number,
    message: string,
    options: { code?: string; requestId?: string; details?: unknown; serverStack?: string } = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = options.code ?? `Http${status}`
    this.requestId = options.requestId
    this.details = options.details
    this.serverStack = options.serverStack
  }
}

export class NetworkError extends Error {
  readonly code = 'NetworkError'
  readonly timedOut: boolean
  /** The TypeError or AbortError raised by fetch. */
  readonly originalError?: unknown

  constructor(timedOut: boolean, options: { cause?: unknown } = {}) {
    super(timedOut ? 'Le service ne répond pas.' : 'Connexion au service impossible.')
    this.name = 'NetworkError'
    this.timedOut = timedOut
    this.originalError = options.cause
  }
}

function isApiErrorBody(body: unknown): body is ApiErrorBody {
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as ApiErrorBody).error === 'string' &&
    typeof (body as ApiErrorBody).message === 'string'
  )
}

/**
 * Error response → ApiError. Also used by the services that still call fetch directly.
 * A body that does not follow the contract (nginx 502 page…) keeps the status only.
 */
export async function apiErrorFromResponse(res: Response): Promise<ApiError> {
  const headerRequestId = res.headers?.get('x-request-id') ?? undefined
  let body: unknown
  try {
    body = await res.json()
  } catch {
    body = undefined
  }

  if (isApiErrorBody(body)) {
    return new ApiError(res.status, body.message, {
      code: body.error,
      requestId: body.requestId ?? headerRequestId,
      details: body.details,
      serverStack: body.stack,
    })
  }
  return new ApiError(res.status, `HTTP error ${res.status}`, { requestId: headerRequestId })
}

// Called when a request sent with a session token answers 401: the session expired or was
// revoked. Registered by main.ts, which owns the store and the router.
let onUnauthorized: (() => void) | undefined

export function setUnauthorizedHandler(handler: (() => void) | undefined) {
  onUnauthorized = handler
}

function getAuthToken(): string | null {
  return localStorage.getItem('auth_token')
}

/**
 * fetch with the 10 s limit: no answer in time, or no network → NetworkError. Used by the client
 * below and by the services that still call fetch directly, so that nothing waits forever.
 */
export async function fetchWithTimeout(
  input: RequestInfo,
  init: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, REQUEST_TIMEOUT_MS)
  // A signal from the caller (component unmounted…) still cancels the request.
  init.signal?.addEventListener('abort', () => controller.abort(), { once: true })

  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } catch (error) {
    if (init.signal?.aborted) throw error
    throw new NetworkError(timedOut, { cause: error })
  } finally {
    clearTimeout(timer)
  }
}

interface RequestOptions {
  /** Sends the session token. Off for public data, which may be relayed to a third party. */
  auth?: boolean
}

async function request<T>(
  input: RequestInfo,
  init: RequestInit = {},
  { auth = true }: RequestOptions = {},
): Promise<T> {
  const token = auth ? getAuthToken() : null

  const res = await fetchWithTimeout(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  })

  if (!res.ok) {
    const error = await apiErrorFromResponse(res)
    // Without a token, a 401 is a wrong password, not an expired session.
    if (res.status === 401 && token) onUnauthorized?.()
    throw error
  }

  // No body (204 No Content).
  if (res.status === 204) {
    return undefined as unknown as T
  }

  return (await res.json()) as T
}

export const http = {
  get: <T>(url: string, init?: RequestInit) => request<T>(url, { method: 'GET', ...init }),
  /** GET of public data (Clash Royale, RoyaleAPI, meta): no session token, no session expiry. */
  getPublic: <T>(url: string, init?: RequestInit) =>
    request<T>(url, { method: 'GET', ...init }, { auth: false }),
  post: <T>(url: string, body: unknown, init?: RequestInit) =>
    request<T>(url, { method: 'POST', body: JSON.stringify(body), ...init }),
  put: <T>(url: string, body: unknown, init?: RequestInit) =>
    request<T>(url, { method: 'PUT', body: JSON.stringify(body), ...init }),
  patch: <T>(url: string, body: unknown, init?: RequestInit) =>
    request<T>(url, { method: 'PATCH', body: JSON.stringify(body), ...init }),
  delete: <T>(url: string, init?: RequestInit) => request<T>(url, { method: 'DELETE', ...init }),
}

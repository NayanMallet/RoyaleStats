/**
 * Minimal fetch mock for Storybook.
 *
 * Components call the API Gateway through `fetch` (directly or via services/http.ts).
 * In Storybook there is no Gateway, so each story declares the responses it needs:
 *
 *   parameters: {
 *     mockApi: [{ method: 'GET', url: /\/api\/meta\/snapshot$/, body: { snapshot } }],
 *   }
 *
 * Calls to another origin (RoyaleAPI assets, GitHub…) are intercepted too: a story never
 * depends on the network. Match them with a RegExp, which is then tested against the full URL.
 *
 * Unmatched calls answer 404 and are logged, so a missing mock is visible in the console.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface MockRoute {
  /** Defaults to GET. */
  method?: HttpMethod
  /**
   * Same-origin calls are matched on their path (`/api/...`), other origins on their full URL.
   * A string must match exactly, query string excluded; a RegExp is tested with the query string.
   */
  url: string | RegExp
  /** Defaults to 200. */
  status?: number
  body?: unknown
  /** Artificial latency in ms, handy to show loading states. Use Infinity to never resolve. */
  delay?: number
}

function matches(route: MockRoute, method: string, target: string): boolean {
  if ((route.method ?? 'GET') !== method) return false
  return typeof route.url === 'string' ? route.url === target.split('?')[0] : route.url.test(target)
}

function toUrl(input: RequestInfo | URL): URL {
  const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  return new URL(raw, window.location.origin)
}

/**
 * Replaces window.fetch for /api/* and cross-origin calls, and returns a function that
 * restores it.
 */
export function installFetchMock(routes: MockRoute[]): () => void {
  const originalFetch = window.fetch

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = toUrl(input)
    const sameOrigin = url.origin === window.location.origin
    const target = sameOrigin ? url.pathname + url.search : url.href

    // Same-origin files that are not API calls (Vite modules, assets…) load as usual.
    if (sameOrigin && !url.pathname.startsWith('/api/')) return originalFetch(input, init)

    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
    const route = routes.find((candidate) => matches(candidate, method, target))

    if (!route) {
      console.warn(`[storybook mock] no mock for ${method} ${target} → 404`)
      return new Response(JSON.stringify({ error: 'Not mocked in Storybook' }), { status: 404 })
    }

    if (route.delay) {
      await new Promise((resolve) =>
        Number.isFinite(route.delay) ? setTimeout(resolve, route.delay) : undefined,
      )
    }

    const status = route.status ?? 200
    const body = status === 204 || route.body === undefined ? null : JSON.stringify(route.body)
    return new Response(body, { status, headers: { 'Content-Type': 'application/json' } })
  }

  return () => {
    window.fetch = originalFetch
  }
}

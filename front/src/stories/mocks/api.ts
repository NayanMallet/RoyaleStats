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
 * Unmatched calls answer 404 and are logged, so a missing mock is visible in the console.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface MockRoute {
  /** Defaults to GET. */
  method?: HttpMethod
  /** A string must match the URL path exactly; a RegExp is tested against path + query. */
  url: string | RegExp
  /** Defaults to 200. */
  status?: number
  body?: unknown
  /** Artificial latency in ms, handy to show loading states. Use Infinity to never resolve. */
  delay?: number
}

function matches(route: MockRoute, method: string, path: string): boolean {
  if ((route.method ?? 'GET') !== method) return false
  return typeof route.url === 'string' ? route.url === path.split('?')[0] : route.url.test(path)
}

function toPath(input: RequestInfo | URL): string {
  const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  const url = new URL(raw, window.location.origin)
  return url.pathname + url.search
}

/** Replaces window.fetch for /api/* calls and returns a function that restores it. */
export function installFetchMock(routes: MockRoute[]): () => void {
  const originalFetch = window.fetch

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = toPath(input)

    // Anything that is not an API call (images, Vite modules…) goes to the network as usual.
    if (!path.startsWith('/api/')) return originalFetch(input, init)

    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
    const route = routes.find((candidate) => matches(candidate, method, path))

    if (!route) {
      console.warn(`[storybook mock] no mock for ${method} ${path} → 404`)
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

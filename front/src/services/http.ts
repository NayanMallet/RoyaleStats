export class HttpError extends Error {
  public readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function getAuthToken(): string | null {
  return localStorage.getItem('auth_token')
}

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const token = getAuthToken()

  const res = await fetch(input, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
    ...init,
  })

  if (!res.ok) {
    const message = `HTTP error ${res.status}`
    throw new HttpError(message, res.status)
  }

  // si pas de body (204, etc.)
  if (res.status === 204) {
    return undefined as unknown as T
  }

  return (await res.json()) as T
}

export const http = {
  get: <T>(url: string, init?: RequestInit) => request<T>(url, { method: 'GET', ...init }),
  post: <T>(url: string, body: unknown, init?: RequestInit) =>
    request<T>(url, { method: 'POST', body: JSON.stringify(body), ...init }),
  put: <T>(url: string, body: unknown, init?: RequestInit) =>
    request<T>(url, { method: 'PUT', body: JSON.stringify(body), ...init }),
  patch: <T>(url: string, body: unknown, init?: RequestInit) =>
    request<T>(url, { method: 'PATCH', body: JSON.stringify(body), ...init }),
  delete: <T>(url: string, init?: RequestInit) => request<T>(url, { method: 'DELETE', ...init }),
}

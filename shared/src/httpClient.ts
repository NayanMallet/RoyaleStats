// HTTP client utility for inter-service communication

export class HttpError extends Error {
    constructor(
        public statusCode: number,
        message: string,
    ) {
        super(message)
        this.name = 'HttpError'
    }
}

export async function fetchJson<T>(
    url: string,
    options?: RequestInit,
): Promise<T> {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
            ...options,
        })

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`
            try {
                const errorData = await response.json()
                errorMessage = errorData.message || errorData.error || errorMessage
            } catch {
                // If error response is not JSON, use status text
            }
            throw new HttpError(response.status, errorMessage)
        }

        // Handle no-content responses
        if (response.status === 204) {
            return undefined as T
        }

        return await response.json()
    } catch (error) {
        if (error instanceof HttpError) {
            throw error
        }
        throw new HttpError(500, `Network error: ${(error as Error).message}`)
    }
}

export const httpClient = {
    get: <T>(url: string, options?: RequestInit): Promise<T> =>
        fetchJson<T>(url, { method: 'GET', ...options }),

    post: <T>(url: string, body: unknown, options?: RequestInit): Promise<T> =>
        fetchJson<T>(url, {
            method: 'POST',
            body: JSON.stringify(body),
            ...options,
        }),

    put: <T>(url: string, body: unknown, options?: RequestInit): Promise<T> =>
        fetchJson<T>(url, {
            method: 'PUT',
            body: JSON.stringify(body),
            ...options,
        }),

    delete: <T>(url: string, options?: RequestInit): Promise<T> =>
        fetchJson<T>(url, { method: 'DELETE', ...options }),
}

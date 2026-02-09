const API_GATEWAY_BASE_URL = import.meta.env.VITE_API_GATEWAY_URL ?? 'http://localhost:3000'

export const apiEndpoints = {
  auth: {
    login: `${API_GATEWAY_BASE_URL}/api/users/login`,
    register: `${API_GATEWAY_BASE_URL}/api/users/register`,
    me: `${API_GATEWAY_BASE_URL}/api/users/me`,
  },
  users: {
    list: `${API_GATEWAY_BASE_URL}/api/users`,
    create: `${API_GATEWAY_BASE_URL}/api/users`,
  },
  items: {
    list: `${API_GATEWAY_BASE_URL}/api/items`,
    create: `${API_GATEWAY_BASE_URL}/api/items`,
  },
  link: {
    create: `${API_GATEWAY_BASE_URL}/api/link`,
    update: (userId: number) => `${API_GATEWAY_BASE_URL}/api/link/${userId}`,
    get: (userId: number) => `${API_GATEWAY_BASE_URL}/api/link/${userId}`,
    getByTag: (tag: string) => `${API_GATEWAY_BASE_URL}/api/link/tag/${encodeURIComponent(tag)}`,
    delete: (userId: number) => `${API_GATEWAY_BASE_URL}/api/link/${userId}`,
  },
}

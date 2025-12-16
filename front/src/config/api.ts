const API_GATEWAY_BASE_URL = import.meta.env.VITE_API_GATEWAY_URL ?? 'http://localhost:3000'

export const apiEndpoints = {
  users: {
    list: `${API_GATEWAY_BASE_URL}/api/users`,
    create: `${API_GATEWAY_BASE_URL}/api/users`,
  },
}

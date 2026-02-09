import { http } from './http'
import { apiEndpoints } from '@/config/api'

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  user: {
    id: number
    name: string
    email: string
    created_at: string
  }
}

export interface User {
  id: number
  name: string
  email: string
  created_at: string
  updated_at?: string
}

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const response = await http.post<AuthResponse>(apiEndpoints.auth.login, payload)
    this.saveAuth(response)
    return response
  },

  async register(payload: RegisterPayload): Promise<User> {
    const response = await http.post<User>(apiEndpoints.auth.register, payload)
    return response
  },

  async getMe(): Promise<User> {
    return http.get<User>(apiEndpoints.auth.me)
  },

  async updateUser(payload: { name?: string; email?: string }): Promise<User> {
    return http.put<User>(apiEndpoints.auth.me, payload)
  },

  saveAuth(response: AuthResponse) {
    localStorage.setItem(TOKEN_KEY, response.token)
    localStorage.setItem(USER_KEY, JSON.stringify(response.user))
  },

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  },

  getUser(): User | null {
    const userStr = localStorage.getItem(USER_KEY)
    if (!userStr) return null
    try {
      return JSON.parse(userStr)
    } catch {
      return null
    }
  },

  isAuthenticated(): boolean {
    return !!this.getToken()
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },
}

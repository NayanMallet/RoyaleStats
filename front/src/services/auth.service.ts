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

// Browser storage of the session. Only this service and the auth store read or write it.
export const SESSION_KEYS = {
  token: 'auth_token',
  user: 'auth_user',
  linkedPlayerTag: 'linked_player_tag',
} as const
const TOKEN_KEY = SESSION_KEYS.token
const USER_KEY = SESSION_KEYS.user

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

  saveUser(user: User) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },

  getLinkedPlayerTag(): string | null {
    return localStorage.getItem(SESSION_KEYS.linkedPlayerTag)
  },

  saveLinkedPlayerTag(tag: string | null) {
    if (tag) localStorage.setItem(SESSION_KEYS.linkedPlayerTag, tag)
    else localStorage.removeItem(SESSION_KEYS.linkedPlayerTag)
  },

  /** Removes everything the session stored: token, user and linked tag. */
  clearSession() {
    for (const key of Object.values(SESSION_KEYS)) localStorage.removeItem(key)
  },
}

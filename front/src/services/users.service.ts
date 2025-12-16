import { http } from './http'
import type { User } from '@/types/user'
import { apiEndpoints } from '@/config/api'

export async function fetchUsers(): Promise<User[]> {
  return http.get<User[]>(apiEndpoints.users.list)
}

export async function createUser(payload: { player_tag: string; password: string }): Promise<User> {
  return http.post<User>(apiEndpoints.users.create, payload)
}

/**
 * Puts the app in a given authentication state before a story renders.
 * The services read localStorage and the components read the Pinia store, so both are set.
 *
 *   parameters: { auth: 'linked' }
 */
import type { Pinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { demoLink, demoUser } from './fixtures'

export type AuthState = 'guest' | 'user' | 'linked'

export function applyAuthState(pinia: Pinia, state: AuthState = 'guest'): void {
  // beforeEach runs before the Vue app exists, so the Pinia instance is passed explicitly.
  const store = useAuthStore(pinia)

  store.logout()
  if (state === 'guest') return

  localStorage.setItem('auth_token', 'storybook-token')
  localStorage.setItem('auth_user', JSON.stringify(demoUser))
  store.setAuth(demoUser, 'storybook-token')

  if (state === 'linked') store.setLinkedPlayerTag(demoLink.player_tag)
}

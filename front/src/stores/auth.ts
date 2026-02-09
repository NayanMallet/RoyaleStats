import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { authService, type User } from '@/services/auth.service'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(authService.getUser())
  const token = ref<string | null>(authService.getToken())
  const linkedPlayerTag = ref<string | null>(localStorage.getItem('linked_player_tag'))

  const isAuthenticated = computed(() => !!token.value)
  const hasLinkedPlayer = computed(() => !!linkedPlayerTag.value)

  function setAuth(authUser: User, authToken: string) {
    user.value = authUser
    token.value = authToken
  }

  function logout() {
    user.value = null
    token.value = null
    linkedPlayerTag.value = null
    authService.logout()
  }

  function updateUser(updatedUser: User) {
    user.value = updatedUser
    // Update localStorage
    if (updatedUser) {
      localStorage.setItem('auth_user', JSON.stringify(updatedUser))
    }
  }

  function setLinkedPlayerTag(tag: string | null) {
    linkedPlayerTag.value = tag
    if (tag) {
      localStorage.setItem('linked_player_tag', tag)
    } else {
      localStorage.removeItem('linked_player_tag')
    }
  }

  return {
    user,
    token,
    linkedPlayerTag,
    isAuthenticated,
    hasLinkedPlayer,
    setAuth,
    logout,
    updateUser,
    setLinkedPlayerTag,
  }
})

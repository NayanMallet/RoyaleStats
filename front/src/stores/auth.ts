import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { authService, type User } from '@/services/auth.service'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(authService.getUser())
  const token = ref<string | null>(authService.getToken())

  const isAuthenticated = computed(() => !!token.value)

  function setAuth(authUser: User, authToken: string) {
    user.value = authUser
    token.value = authToken
  }

  function logout() {
    user.value = null
    token.value = null
    authService.logout()
  }

  function updateUser(updatedUser: User) {
    user.value = updatedUser
    // Update localStorage
    if (updatedUser) {
      localStorage.setItem('auth_user', JSON.stringify(updatedUser))
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    setAuth,
    logout,
    updateUser,
  }
})

<script setup lang="ts">
import { ref } from 'vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowLeft, LogIn } from 'lucide-vue-next'
import AppLogo from '@/statics/Logo.png'
import { authService } from '@/services/auth.service'
import { ApiError } from '@/services/http'
import { describeApiError } from '@/composables/useApiError'
import { useAuthStore } from '@/stores/auth'
import { linkService } from '@/services/link.service'
import { safeRedirect } from '@/lib/redirect'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const isLoading = ref(false)
const email = ref('')
const password = ref('')
const emailError = ref('')
const passwordError = ref('')

const handleLogin = async () => {
  emailError.value = ''
  passwordError.value = ''

  if (!email.value) {
    emailError.value = "L'email est requis"
    return
  }
  if (!password.value) {
    passwordError.value = 'Le mot de passe est requis'
    return
  }

  isLoading.value = true
  try {
    const response = await authService.login({
      email: email.value,
      password: password.value,
    })

    authStore.setAuth(response.user, response.token)

    // Fetch linked player after login
    try {
      const link = await linkService.getLink()
      if (link) {
        authStore.setLinkedPlayerTag(link.player_tag)
      }
    } catch {
      // Ignore error - user might not have a linked player
    }

    router.push(safeRedirect(route.query.redirect))
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      emailError.value = 'Email ou mot de passe incorrect'
      passwordError.value = 'Email ou mot de passe incorrect'
      return
    }
    // Business message of the API (400, 429…) or the HTTP → UX table (unavailable, network).
    const fieldErrors =
      error instanceof ApiError && error.status === 400
        ? ((error.details ?? {}) as Partial<Record<'email' | 'password', string>>)
        : {}
    if (fieldErrors.email || fieldErrors.password) {
      emailError.value = fieldErrors.email ?? ''
      passwordError.value = fieldErrors.password ?? ''
    } else {
      emailError.value = describeApiError(error).message
    }
    if (!(error instanceof ApiError && error.status < 500)) console.error('Login error:', error)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div
    class="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden font-sans"
  >
    <ThemeToggle class="absolute right-4 top-4 z-20" />
    <!-- Background Elements -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        class="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-info-soft/50 to-transparent"
      ></div>
      <div class="absolute -top-40 -right-40 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"></div>
      <div class="absolute top-40 -left-20 w-72 h-72 bg-purple-400/20 rounded-full blur-3xl"></div>
    </div>

    <!-- Main Card -->
    <div class="w-full max-w-md mx-4 relative z-10 animate-in fade-in zoom-in-95 duration-500">
      <!-- Logo Section -->
      <div class="flex justify-center mb-8">
        <img
          :src="AppLogo"
          alt="Royale Stats Logo"
          class="h-24 w-auto hover:scale-105 transition-transform duration-300"
        />
      </div>

      <div
        class="bg-card/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-surface-shadow/50 border border-card/50 overflow-hidden p-8 sm:p-12"
      >
        <!-- Header -->
        <div class="text-center mb-10">
          <h1 class="text-3xl font-black text-foreground tracking-tight mb-2">Bon retour !</h1>
          <p class="text-muted-foreground font-medium">Connectez-vous à votre compte</p>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleLogin" class="space-y-6">
          <div class="space-y-2">
            <Label
              for="email"
              class="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1"
              >Email</Label
            >
            <Input
              id="email"
              v-model="email"
              type="email"
              placeholder="exemple@email.com"
              :class="[
                'h-12 rounded-xl bg-background transition-all font-medium',
                emailError
                  ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                  : 'border-border focus:ring-blue-500/20 focus:border-blue-500',
              ]"
            />
            <p v-if="emailError" class="text-xs font-medium text-destructive ml-1 mt-1">
              {{ emailError }}
            </p>
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <Label
                for="password"
                class="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1"
                >Mot de passe</Label
              >
              <a href="#" class="text-xs font-bold text-info hover:text-info hover:underline"
                >Oublié ?</a
              >
            </div>
            <Input
              id="password"
              v-model="password"
              type="password"
              placeholder="••••••••"
              :class="[
                'h-12 rounded-xl bg-background transition-all font-medium',
                passwordError
                  ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                  : 'border-border focus:ring-blue-500/20 focus:border-blue-500',
              ]"
            />
            <p v-if="passwordError" class="text-xs font-medium text-destructive ml-1 mt-1">
              {{ passwordError }}
            </p>
          </div>

          <Button
            type="submit"
            class="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 active:scale-[0.98] transition-all mt-4"
            :disabled="isLoading"
          >
            <Loader2 v-if="isLoading" class="mr-2 h-5 w-5 animate-spin" />
            <span v-else class="flex items-center gap-2">
              Se connecter
              <LogIn class="w-5 h-5" />
            </span>
          </Button>
        </form>

        <!-- Footer -->
        <div class="mt-8 pt-6 border-t border-border text-center">
          <p class="text-sm text-muted-foreground font-medium">
            Pas encore de compte ?
            <router-link to="/register" class="text-info font-bold hover:text-info hover:underline">
              Créer un compte
            </router-link>
          </p>
        </div>
      </div>

      <!-- Back Button -->
      <div class="mt-8 text-center">
        <router-link to="/">
          <Button
            variant="ghost"
            class="text-muted-foreground hover:text-foreground hover:bg-card/50 rounded-xl gap-2"
          >
            <ArrowLeft class="w-4 h-4" /> Retour à l'accueil
          </Button>
        </router-link>
      </div>
    </div>
  </div>
</template>

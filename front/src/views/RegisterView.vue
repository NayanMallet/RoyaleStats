<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowLeft, UserPlus } from 'lucide-vue-next'
import AppLogo from '@/statics/Logo.png'
import { authService } from '@/services/auth.service'
import { HttpError } from '@/services/http'

const router = useRouter()
const isLoading = ref(false)
const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const usernameError = ref('')
const emailError = ref('')
const passwordError = ref('')
const confirmPasswordError = ref('')

const handleRegister = async () => {
  usernameError.value = ''
  emailError.value = ''
  passwordError.value = ''
  confirmPasswordError.value = ''

  let hasError = false

  if (!username.value) {
    usernameError.value = 'Le pseudo est requis'
    hasError = true
  }
  if (!email.value) {
    emailError.value = 'L\'email est requis'
    hasError = true
  }
  if (!password.value) {
    passwordError.value = 'Le mot de passe est requis'
    hasError = true
  } else if (password.value.length < 6) {
    passwordError.value = 'Le mot de passe doit contenir au moins 6 caractères'
    hasError = true
  }
  if (!confirmPassword.value) {
    confirmPasswordError.value = 'Veuillez confirmer le mot de passe'
    hasError = true
  } else if (password.value !== confirmPassword.value) {
    confirmPasswordError.value = 'Les mots de passe ne correspondent pas'
    hasError = true
  }

  if (hasError) return

  isLoading.value = true
  try {
    await authService.register({
      name: username.value,
      email: email.value,
      password: password.value,
    })

    router.push('/login')
  } catch (error) {
    if (error instanceof HttpError) {
      if (error.status === 409) {
        emailError.value = 'Un compte existe déjà avec cet email'
      } else {
        emailError.value = "Erreur lors de l'inscription au serveur"
      }
    } else {
      emailError.value = "Erreur lors de l'inscription au serveur"
    }
    console.error('Register error:', error)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div
    class="min-h-screen w-full flex items-center justify-center bg-slate-50 relative overflow-hidden font-sans py-12"
  >
    <!-- Background Elements -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        class="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-orange-100/50 to-transparent"
      ></div>
      <div
        class="absolute bottom-0 right-0 w-[500px] h-[500px] bg-orange-200/20 rounded-full blur-3xl"
      ></div>
    </div>

    <!-- Main Card -->
    <div class="w-full max-w-md mx-4 relative z-10 animate-in fade-in zoom-in-95 duration-500">
      <!-- Logo Section -->
      <div class="flex justify-center mb-8">
        <img
          :src="AppLogo"
          alt="Royale Stats Logo"
          class="h-20 w-auto hover:scale-105 transition-transform duration-300"
        />
      </div>

      <div
        class="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-white/50 overflow-hidden p-8 sm:p-12"
      >
        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-black text-slate-800 tracking-tight mb-2">Créer un compte</h1>
          <p class="text-slate-500 font-medium">Rejoignez l'élite de RoyaleStats</p>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleRegister" class="space-y-5">
          <div class="space-y-2">
            <Label
              for="username"
              class="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1"
              >Pseudo</Label
            >
            <Input
              id="username"
              v-model="username"
              type="text"
              placeholder="KingRoyale123"
              :class="[
                'h-11 rounded-xl bg-slate-50 transition-all font-medium',
                usernameError
                  ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                  : 'border-slate-200 focus:ring-orange-500/20 focus:border-orange-500'
              ]"
            />
            <p v-if="usernameError" class="text-xs font-medium text-red-600 ml-1 mt-1">{{ usernameError }}</p>
          </div>

          <div class="space-y-2">
            <Label
              for="email"
              class="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1"
              >Email</Label
            >
            <Input
              id="email"
              v-model="email"
              type="email"
              placeholder="exemple@email.com"
              :class="[
                'h-11 rounded-xl bg-slate-50 transition-all font-medium',
                emailError
                  ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                  : 'border-slate-200 focus:ring-orange-500/20 focus:border-orange-500'
              ]"
            />
            <p v-if="emailError" class="text-xs font-medium text-red-600 ml-1 mt-1">{{ emailError }}</p>
          </div>

          <div class="space-y-2">
            <Label
              for="password"
              class="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1"
              >Mot de passe</Label
            >
            <Input
              id="password"
              v-model="password"
              type="password"
              placeholder="••••••••"
              :class="[
                'h-11 rounded-xl bg-slate-50 transition-all font-medium',
                passwordError
                  ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                  : 'border-slate-200 focus:ring-orange-500/20 focus:border-orange-500'
              ]"
            />
            <p v-if="passwordError" class="text-xs font-medium text-red-600 ml-1 mt-1">{{ passwordError }}</p>
          </div>

          <div class="space-y-2">
            <Label
              for="confirmPassword"
              class="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1"
              >Confirmer</Label
            >
            <Input
              id="confirmPassword"
              v-model="confirmPassword"
              type="password"
              placeholder="••••••••"
              :class="[
                'h-11 rounded-xl bg-slate-50 transition-all font-medium',
                confirmPasswordError
                  ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                  : 'border-slate-200 focus:ring-orange-500/20 focus:border-orange-500'
              ]"
            />
            <p v-if="confirmPasswordError" class="text-xs font-medium text-red-600 ml-1 mt-1">{{ confirmPasswordError }}</p>
          </div>

          <Button
            type="submit"
            class="w-full h-14 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-lg font-bold shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 active:scale-[0.98] transition-all mt-6"
            :disabled="isLoading"
          >
            <Loader2 v-if="isLoading" class="mr-2 h-5 w-5 animate-spin" />
            <span v-else class="flex items-center gap-2">
              S'inscrire
              <UserPlus class="w-5 h-5" />
            </span>
          </Button>
        </form>

        <!-- Footer -->
        <div class="mt-8 pt-6 border-t border-slate-100 text-center">
          <p class="text-sm text-slate-500 font-medium">
            Déjà un compte ?
            <router-link
              to="/login"
              class="text-orange-600 font-bold hover:text-orange-700 hover:underline"
            >
              Se connecter
            </router-link>
          </p>
        </div>
      </div>

      <!-- Back Button -->
      <div class="mt-8 text-center">
        <router-link to="/">
          <Button
            variant="ghost"
            class="text-slate-500 hover:text-slate-800 hover:bg-white/50 rounded-xl gap-2"
          >
            <ArrowLeft class="w-4 h-4" /> Retour à l'accueil
          </Button>
        </router-link>
      </div>
    </div>
  </div>
</template>

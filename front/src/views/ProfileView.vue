<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, Save, Loader2, Mail, User as UserIcon, Lock } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { authService } from '@/services/auth.service'
import { HttpError } from '@/services/http'
import profilePicture from '@/assets/pp.jpg'

const router = useRouter()
const authStore = useAuthStore()

const isLoading = ref(false)
const name = ref(authStore.user?.name || '')
const email = ref(authStore.user?.email || '')

const userInitials = computed(() => {
  const user = authStore.user
  if (!user || !user.name) return 'U'
  const names = user.name.split(' ').filter(n => n.length > 0)
  if (names.length >= 2) {
    const first = names[0] as string
    const second = names[1] as string
    return (first.charAt(0) + second.charAt(0)).toUpperCase()
  }
  return user.name.substring(0, 2).toUpperCase()
})

const handleUpdate = async () => {
  if (!name.value || !email.value) {
    toast.error('Veuillez remplir tous les champs')
    return
  }

  if (name.value === authStore.user?.name && email.value === authStore.user?.email) {
    toast.info('Aucune modification à enregistrer')
    return
  }

  isLoading.value = true
  try {
    const updatedUser = await authService.updateUser({
      name: name.value,
      email: email.value,
    })

    authStore.updateUser(updatedUser)
    toast.success('Profil mis à jour avec succès !')
  } catch (error) {
    if (error instanceof HttpError) {
      if (error.status === 409) {
        toast.error('Cet email est déjà utilisé')
      } else if (error.status === 401) {
        toast.error('Session expirée, veuillez vous reconnecter')
        authStore.logout()
        router.push('/login')
      } else {
        toast.error('Erreur lors de la mise à jour du profil')
      }
    } else {
      toast.error('Erreur lors de la mise à jour du profil')
    }
    console.error('Update error:', error)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen w-full bg-slate-50 relative overflow-hidden">
    <!-- Background Elements -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        class="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-blue-100/50 to-transparent"
      ></div>
      <div class="absolute -top-40 -right-40 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"></div>
      <div class="absolute top-60 -left-20 w-72 h-72 bg-purple-400/20 rounded-full blur-3xl"></div>
    </div>

    <!-- Content -->
    <div class="relative z-10 max-w-4xl mx-auto px-4 py-8">
      <!-- Back Button -->
      <div class="mb-6">
        <Button
          @click="router.push('/')"
          variant="ghost"
          class="text-slate-600 hover:text-slate-900 hover:bg-white/50 rounded-xl gap-2"
        >
          <ArrowLeft class="w-4 h-4" /> Retour à l'accueil
        </Button>
      </div>

      <!-- Profile Card -->
      <Card
        class="bg-white/80 backdrop-blur-xl border-white/50 shadow-2xl animate-in fade-in zoom-in-95 duration-500"
      >
        <CardHeader class="space-y-1 pb-6">
          <div class="flex items-center gap-6">
            <!-- Avatar -->
            <Avatar class="h-24 w-24 border-4 border-white shadow-xl">
              <AvatarImage :src="profilePicture" alt="Profile" />
              <AvatarFallback
                class="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-2xl"
              >
                {{ userInitials }}
              </AvatarFallback>
            </Avatar>

            <div class="flex-1">
              <CardTitle class="text-3xl font-black text-slate-800">Mon Profil</CardTitle>
              <CardDescription class="text-base mt-2"
                >Gérez vos informations personnelles</CardDescription
              >
            </div>
          </div>
        </CardHeader>

        <Separator class="mb-6" />

        <CardContent class="space-y-6">
          <!-- User Info Section -->
          <div class="space-y-6">
            <div>
              <h3 class="text-lg font-bold text-slate-700 mb-4">Informations du compte</h3>
              <div class="grid gap-4">
                <!-- Name -->
                <div class="space-y-2">
                  <Label for="name" class="text-sm font-bold text-slate-600 flex items-center gap-2">
                    <UserIcon class="w-4 h-4" />
                    Nom
                  </Label>
                  <Input
                    id="name"
                    v-model="name"
                    type="text"
                    placeholder="Votre nom"
                    class="h-12 rounded-xl bg-slate-50/50 border-slate-200 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <!-- Email -->
                <div class="space-y-2">
                  <Label
                    for="email"
                    class="text-sm font-bold text-slate-600 flex items-center gap-2"
                  >
                    <Mail class="w-4 h-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    v-model="email"
                    type="email"
                    placeholder="votre@email.com"
                    class="h-12 rounded-xl bg-slate-50/50 border-slate-200 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <!-- Account Details -->
            <div>
              <h3 class="text-lg font-bold text-slate-700 mb-3">Détails du compte</h3>
              <div class="bg-slate-50/50 rounded-xl p-4 space-y-2">
                <div class="flex justify-between items-center text-sm">
                  <span class="text-slate-500 font-medium">Date de création</span>
                  <span class="font-bold text-slate-700">
                    {{ new Date(authStore.user?.created_at || '').toLocaleDateString('fr-FR') }}
                  </span>
                </div>
                <div v-if="authStore.user?.updated_at" class="flex justify-between items-center text-sm">
                  <span class="text-slate-500 font-medium">Dernière modification</span>
                  <span class="font-bold text-slate-700">
                    {{ new Date(authStore.user.updated_at).toLocaleDateString('fr-FR') }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-3 pt-4">
            <Button
              @click="handleUpdate"
              :disabled="isLoading"
              class="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all"
            >
              <Loader2 v-if="isLoading" class="mr-2 h-5 w-5 animate-spin" />
              <Save v-else class="mr-2 h-5 w-5" />
              Enregistrer les modifications
            </Button>
            <!-- <Button
              @click="router.push('/')"
              variant="outline"
              class="h-12 rounded-xl border-slate-200 hover:bg-slate-50"
            >
              Annuler
            </Button> -->
          </div>
        </CardContent>
      </Card>

      <!-- Additional Cards (Optional) -->
      <div class="mt-6 grid gap-4 md:grid-cols-2">
        <Card class="bg-slate-100/50 backdrop-blur-md border-slate-300/50 relative overflow-hidden">
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Lock class="w-14 h-14 text-black/20" />
          </div>
          <CardHeader class="relative z-10 opacity-50">
            <CardTitle class="text-lg font-bold text-slate-500">Sécurité</CardTitle>
            <CardDescription class="text-slate-400">Gérez la sécurité de votre compte</CardDescription>
          </CardHeader>
          <CardContent class="relative z-10 opacity-50">
            <Button variant="outline" class="w-full rounded-xl border-slate-300 text-slate-400 cursor-not-allowed" disabled>
              Changer le mot de passe
            </Button>
          </CardContent>
        </Card>

        <Card class="bg-slate-100/50 backdrop-blur-md border-slate-300/50 relative overflow-hidden">
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Lock class="w-14 h-14 text-black/20" />
          </div>
          <CardHeader class="relative z-10 opacity-50">
            <CardTitle class="text-lg font-bold text-slate-500">Préférences</CardTitle>
            <CardDescription class="text-slate-400">Personnalisez votre expérience</CardDescription>
          </CardHeader>
          <CardContent class="relative z-10 opacity-50">
            <Button variant="outline" class="w-full rounded-xl border-slate-300 text-slate-400 cursor-not-allowed" disabled> 
              Notifications 
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>

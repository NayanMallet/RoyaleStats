<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowLeft, UserPlus } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import AppLogo from '@/statics/Logo.png'

const router = useRouter()
const isLoading = ref(false)
const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')

const handleRegister = async () => {
    if (!username.value || !email.value || !password.value || !confirmPassword.value) {
        toast.error('Veuillez remplir tous les champs')
        return
    }

    if (password.value !== confirmPassword.value) {
        toast.error('Les mots de passe ne correspondent pas')
        return
    }

    isLoading.value = true
    try {
        // Simulating API call directly in component
        console.log('Fetching register...')
        await new Promise(resolve => setTimeout(resolve, 1500))

        // Mock success
        toast.success('Compte créé avec succès !')
        router.push('/login')
    } catch (error) {
        toast.error('Erreur lors de l\'inscription')
    } finally {
        isLoading.value = false
    }
}
</script>

<template>
    <div
        class="min-h-screen w-full flex items-center justify-center bg-slate-50 relative overflow-hidden font-sans py-12">

        <!-- Background Elements -->
        <div class="absolute inset-0 overflow-hidden pointer-events-none">
            <div class="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-orange-100/50 to-transparent">
            </div>
            <div class="absolute bottom-0 right-0 w-[500px] h-[500px] bg-orange-200/20 rounded-full blur-3xl"></div>
        </div>

        <!-- Main Card -->
        <div class="w-full max-w-md mx-4 relative z-10 animate-in fade-in zoom-in-95 duration-500">

            <!-- Logo Section -->
            <div class="flex justify-center mb-8">
                <img :src="AppLogo" alt="Royale Stats Logo"
                    class="h-20 w-auto drop-shadow-2xl hover:scale-105 transition-transform duration-300 grayscale opacity-80 hover:grayscale-0 hover:opacity-100" />
            </div>

            <div
                class="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-white/50 overflow-hidden p-8 sm:p-12">

                <!-- Header -->
                <div class="text-center mb-8">
                    <h1 class="text-3xl font-black text-slate-800 tracking-tight mb-2">Créer un compte</h1>
                    <p class="text-slate-500 font-medium">Rejoignez l'élite de RoyaleStats</p>
                </div>

                <!-- Form -->
                <form @submit.prevent="handleRegister" class="space-y-5">

                    <div class="space-y-2">
                        <Label for="username"
                            class="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Pseudo</Label>
                        <Input id="username" v-model="username" type="text" placeholder="KingRoyale123"
                            class="h-11 rounded-xl bg-slate-50 border-slate-200 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium" />
                    </div>

                    <div class="space-y-2">
                        <Label for="email"
                            class="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Email</Label>
                        <Input id="email" v-model="email" type="email" placeholder="exemple@email.com"
                            class="h-11 rounded-xl bg-slate-50 border-slate-200 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium" />
                    </div>

                    <div class="space-y-2">
                        <Label for="password" class="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Mot
                            de passe</Label>
                        <Input id="password" v-model="password" type="password" placeholder="••••••••"
                            class="h-11 rounded-xl bg-slate-50 border-slate-200 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium" />
                    </div>

                    <div class="space-y-2">
                        <Label for="confirmPassword"
                            class="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Confirmer</Label>
                        <Input id="confirmPassword" v-model="confirmPassword" type="password" placeholder="••••••••"
                            class="h-11 rounded-xl bg-slate-50 border-slate-200 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium" />
                    </div>

                    <Button type="submit"
                        class="w-full h-14 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-lg font-bold shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 active:scale-[0.98] transition-all mt-6"
                        :disabled="isLoading">
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
                        <router-link to="/login"
                            class="text-orange-600 font-bold hover:text-orange-700 hover:underline">
                            Se connecter
                        </router-link>
                    </p>
                </div>
            </div>

            <!-- Back Button -->
            <div class="mt-8 text-center">
                <router-link to="/">
                    <Button variant="ghost"
                        class="text-slate-500 hover:text-slate-800 hover:bg-white/50 rounded-xl gap-2">
                        <ArrowLeft class="w-4 h-4" /> Retour à l'accueil
                    </Button>
                </router-link>
            </div>

        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowLeft, LogIn } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import AppLogo from '@/statics/Logo.png'

const router = useRouter()
const isLoading = ref(false)
const email = ref('')
const password = ref('')

const handleLogin = async () => {
    if (!email.value || !password.value) {
        toast.error('Veuillez remplir tous les champs')
        return
    }

    isLoading.value = true
    try {
        // Simulating API call directly in component as requested
        console.log('Fetching login...')
        await new Promise(resolve => setTimeout(resolve, 1500))

        // Mock success
        toast.success('Connexion réussie !')
        router.push('/')
    } catch (error) {
        toast.error('Erreur lors de la connexion')
    } finally {
        isLoading.value = false
    }
}
</script>

<template>
    <div class="min-h-screen w-full flex items-center justify-center bg-slate-50 relative overflow-hidden font-sans">

        <!-- Background Elements -->
        <div class="absolute inset-0 overflow-hidden pointer-events-none">
            <div class="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-blue-100/50 to-transparent"></div>
            <div class="absolute -top-40 -right-40 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"></div>
            <div class="absolute top-40 -left-20 w-72 h-72 bg-purple-400/20 rounded-full blur-3xl"></div>
        </div>

        <!-- Main Card -->
        <div class="w-full max-w-md mx-4 relative z-10 animate-in fade-in zoom-in-95 duration-500">

            <!-- Logo Section -->
            <div class="flex justify-center mb-8">
                <img :src="AppLogo" alt="Royale Stats Logo"
                    class="h-24 w-auto hover:scale-105 transition-transform duration-300" />
            </div>

            <div
                class="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-white/50 overflow-hidden p-8 sm:p-12">

                <!-- Header -->
                <div class="text-center mb-10">
                    <h1 class="text-3xl font-black text-slate-800 tracking-tight mb-2">Bon retour !</h1>
                    <p class="text-slate-500 font-medium">Connectez-vous à votre compte</p>
                </div>

                <!-- Form -->
                <form @submit.prevent="handleLogin" class="space-y-6">
                    <div class="space-y-2">
                        <Label for="email"
                            class="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Email</Label>
                        <Input id="email" v-model="email" type="email" placeholder="exemple@email.com"
                            class="h-12 rounded-xl bg-slate-50 border-slate-200 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium" />
                    </div>

                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <Label for="password"
                                class="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Mot de
                                passe</Label>
                            <a href="#"
                                class="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline">Oublié ?</a>
                        </div>
                        <Input id="password" v-model="password" type="password" placeholder="••••••••"
                            class="h-12 rounded-xl bg-slate-50 border-slate-200 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium" />
                    </div>

                    <Button type="submit"
                        class="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-lg font-bold shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 active:scale-[0.98] transition-all mt-4"
                        :disabled="isLoading">
                        <Loader2 v-if="isLoading" class="mr-2 h-5 w-5 animate-spin" />
                        <span v-else class="flex items-center gap-2">
                            Se connecter
                            <LogIn class="w-5 h-5" />
                        </span>
                    </Button>
                </form>

                <!-- Footer -->
                <div class="mt-8 pt-6 border-t border-slate-100 text-center">
                    <p class="text-sm text-slate-500 font-medium">
                        Pas encore de compte ?
                        <router-link to="/register" class="text-blue-600 font-bold hover:text-blue-700 hover:underline">
                            Créer un compte
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

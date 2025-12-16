<script setup lang="ts">
import { ref } from 'vue'
import { Toaster } from '@/components/ui/sonner'
import PlayerStats from '@/components/PlayerStats.vue'
import AppLogo from '@/statics/Logo.png'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Loader2 } from 'lucide-vue-next'

const playerStatsRef = ref()
const searchQuery = ref('')
const searchType = ref<'player' | 'clan'>('player')
const loading = ref(false)

const triggerSearch = async () => {
    if (playerStatsRef.value && searchQuery.value) {
        loading.value = true
        try {
            if (searchType.value === 'player') {
                await playerStatsRef.value.handleSearch(searchQuery.value)
            } else {
                await playerStatsRef.value.handleClanSearch(searchQuery.value)
            }
        } finally {
            loading.value = false
        }
    }
}
</script>

<template>
    <main class="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-900">
        <Toaster />

        <div class="flex flex-col gap-8 px-4 py-6 w-full relative overflow-hidden max-w-[1600px] mx-auto">
             <!-- Background decoration -->
            <div class="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-50 to-transparent -z-10" />

            <!-- Global Navbar -->
            <header class="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 relative z-50 animate-in fade-in slide-in-from-top-4 duration-700">
                
                <!-- Left: Logo -->
                <div class="flex-shrink-0">
                    <img 
                        :src="AppLogo" 
                        alt="Royale Stats Logo" 
                        class="h-16 md:h-20 w-auto object-contain drop-shadow-lg hover:scale-105 transition-transform duration-300 cursor-pointer"
                    />
                </div>

                <!-- Center: Search Bar with Integrated Switcher -->
                <div class="flex-1 w-full md:max-w-3xl flex items-center justify-center">
                     <div class="flex w-full items-center bg-white/90 backdrop-blur-md p-1.5 rounded-2xl shadow-xl shadow-blue-900/5 border border-white/20 transition-all focus-within:ring-4 focus-within:ring-blue-500/10 group">
                        
                        <!-- Switcher Integrated -->
                        <div class="flex bg-slate-100/80 p-1 rounded-xl mr-2 flex-shrink-0">
                            <button 
                                @click="searchType = 'player'"
                                class="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all"
                                :class="searchType === 'player' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'"
                            >
                                Joueur
                            </button>
                            <button 
                                @click="searchType = 'clan'"
                                class="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all"
                                :class="searchType === 'clan' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'"
                            >
                                Clan
                            </button>
                        </div>

                        <div class="relative w-full">
                            <Search 
                                class="absolute left-2 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors" 
                                :class="searchType === 'player' ? 'text-blue-500' : 'text-orange-600'"
                            />
                            <Input 
                                v-model="searchQuery" 
                                :placeholder="searchType === 'player' ? '#TAG Joueur' : '#TAG Clan'" 
                                class="pl-10 h-12 bg-transparent border-none text-lg font-medium focus-visible:ring-0 placeholder:text-slate-300 w-full" 
                                @keyup.enter="triggerSearch"
                            />
                        </div>
                        <Button 
                            @click="triggerSearch" 
                            :disabled="loading" 
                            class="flex-shrink-0 rounded-xl h-12 px-6 text-white font-bold tracking-wide shadow-lg active:scale-95 transition-all min-w-[80px]"
                            :class="searchType === 'player' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/20'"
                        >
                            <Loader2 v-if="loading" class="w-5 h-5 animate-spin" />
                            <span v-else>GO</span>
                        </Button>
                    </div>
                </div>

                <!-- Right: Auth Buttons -->
                <div class="flex items-center gap-3 flex-shrink-0">
                    <Button variant="ghost" class="text-slate-600 h-12 font-bold hover:bg-slate-100 hover:text-slate-900 px-5">
                        Connexion
                    </Button>
                    <Button class="bg-[#DC8F26] text-white h-12 font-bold hover:bg-[#DC8F26]/80 px-6 shadow-lg shadow-[#DC8F26]/20 active:scale-95 transition-all">
                        S'inscrire
                    </Button>
                </div>

            </header>

            <PlayerStats ref="playerStatsRef" />
            
            <footer class="mt-12 text-center text-xs text-slate-300">
                Clash Royale est une marque de Supercell. Ce site n'est pas affilié à Supercell.
            </footer>
        </div>
    </main>
</template>

<script setup lang="ts">
import { ref, watchEffect, computed } from 'vue'
import { fetchPlayer, fetchCards, fetchClan, getClanBadgeUrl, type PlayerProfile, type Card as ApiCard, type ClanDetails } from '@/services/clash.service'
import { getArenaDetails } from '@/services/arenas'
import { toast } from 'vue-sonner'
import { 
    Trophy, Swords, Crown, Shield, Target, Search, Loader2, Users, Zap, TrendingUp, X, Sparkles, Star, Globe
} from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

// -- Types & Logic --
const playerTag = ref('')
const loading = ref(false)
const player = ref<PlayerProfile | null>(null)
const allCards = ref<ApiCard[]>([])
const selectedCard = ref<ApiCard | null>(null)

// Clan Modal Logic
const showClanModal = ref(false)
const selectedClan = ref<ClanDetails | null>(null)
const loadingClan = ref(false)

const openClanModal = async (tag: string) => {
    if (!tag) return
    try {
        loadingClan.value = true
        showClanModal.value = true
        selectedClan.value = await fetchClan(tag)
    } catch (e) {
        toast.error("Impossible de charger les infos du clan")
        showClanModal.value = false
    } finally {
        loadingClan.value = false
    }
}

const closeClanModal = () => {
    showClanModal.value = false
    selectedClan.value = null
}

const handleMemberClick = (tag: string) => {
    closeClanModal()
    playerTag.value = tag
    handleSearch(tag)
}

// Load card definitions for extra info (Description/Elixir)
watchEffect(async () => {
    try {
        allCards.value = await fetchCards()
    } catch (e) {
        console.error('Failed to load card definitions', e)
    }
})

function getCardDefinition(cardName: string) {
    return allCards.value.find(c => c.name === cardName)
}

function getElixirCost(cardName: string): number | string {
    return getCardDefinition(cardName)?.elixirCost ?? '?'
}

// "Strict" Level Logic
function getCalculatedLevel(card: ApiCard): number {
    const baseLevels: Record<string, number> = {
        'common': 1,
        'rare': 3,
        'epic': 6,
        'legendary': 9,
        'champion': 11
    }
    const rarity = (card.rarity?.toLowerCase() || 'common') as keyof typeof baseLevels
    const base = baseLevels[rarity] || 1
    return base + (card.level - 1)
}

// Exposed function for Parent Component
async function handleSearch(tagInput: string) {
    if (!tagInput) return
    let tag = tagInput.trim().toUpperCase()
    if (!tag.startsWith('#')) tag = '#' + tag

    try {
        loading.value = true
        player.value = null 
        player.value = await fetchPlayer(tag)
    } catch (err: any) {
        console.error(err)
        toast.error(err.message || 'Erreur lors de la récupération du joueur')
    } finally {
        loading.value = false
    }
}

// Exposed function for Clan Search (Parent Component)
async function handleClanSearch(tagInput: string) {
    if (!tagInput) return
    let tag = tagInput.trim().toUpperCase()
    if (!tag.startsWith('#')) tag = '#' + tag
    
    // Use existing logic to open clan modal
    openClanModal(tag)
}

// Expose the method to the parent (App.vue)
defineExpose({
    handleSearch,
    handleClanSearch
})

const getWinRate = (wins: number, battles: number) => {
    if (!battles) return '0%'
    return Math.round((wins / battles) * 100) + '%'
}

const openCardModal = (card: ApiCard) => {
    selectedCard.value = card
}

const closeCardModal = () => {
    selectedCard.value = null
}

const hasBadgeError = ref(false)

const handleImageError = () => {
    // Switch to fallback component
    hasBadgeError.value = true 
}

const showBadgesModal = ref(false)

const openBadgesModal = () => {
    showBadgesModal.value = true
}

const closeBadgesModal = () => {
    showBadgesModal.value = false
}

// Computed Properties
const goblinProgress = computed(() => {
    if (!player.value?.progress) return null
    const keys = Object.keys(player.value.progress).filter(k => k !== '' && (k.includes('Goblin') || k.includes('AutoChess')))
    if (keys.length > 0) {
        const key = keys[0] as string
        return player.value.progress![key]
    }
    return null
})

const rankedStats = computed(() => {
    if (!player.value) return null
    return {
        current: player.value.currentPathOfLegendSeasonResult,
        last: player.value.lastPathOfLegendSeasonResult,
        best: player.value.bestPathOfLegendSeasonResult
    }
})

const filteredBadges = computed(() => {
    return player.value?.badges || []
})

// Use favorite card or first deck card for Hero Background
const heroImage = computed(() => {
    if (!player.value) return null
    // @ts-ignore
    const fav = player.value.currentFavouriteCard
    if (fav) return fav.iconUrls.heroMedium || fav.iconUrls.medium
    
    if (player.value.currentDeck && player.value.currentDeck.length > 0) {
        const first = player.value.currentDeck[0]
        if (first) {
             return first.iconUrls.heroMedium || first.iconUrls.medium
        }
    }
    return null
})

</script>

<template>
    <div class="flex flex-col gap-12 w-full max-w-7xl mx-auto font-sans pb-24 px-4 sm:px-6">
        
        <!-- Dashboard -->
        <div v-if="player" class="animate-in fade-in slide-in-from-bottom-12 duration-1000 space-y-12">
            
            <!-- Hero Section -->
            <div class="relative overflow-hidden rounded-[2.5rem] bg-slate-900 text-white shadow-2xl shadow-slate-900/20 group">
                <!-- Hero Background -->
                <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900/40 z-10"></div>
                <!-- Arena Image (Right Side) -->
                <img 
                    v-if="player.arena" 
                    :src="getArenaDetails(player.arena.id, player.arena.name).image" 
                    class="absolute right-8 top-1/2 -translate-y-1/2 w-auto h-auto max-w-[60%] max-h-[110%] object-contain opacity-80"
                />
                <img v-if="heroImage" :src="heroImage" class="absolute right-12 top-1/2 -translate-y-1/2 w-1/2 md:w-1/3 h-auto object-contain opacity-20 blur-sm md:blur-0 mix-blend-overlay group-hover:scale-105 transition-transform duration-1000 rotate-12" />
                
                <div class="relative z-20 p-8 md:p-16 flex flex-col md:flex-row items-center md:items-start gap-10">
                    <!-- Avatar -->
                    <div class="relative shrink-0">
                        <div class="absolute inset-0 bg-yellow-400 rounded-full blur-2xl opacity-20 animate-pulse"></div>
                        <div class="bg-gradient-to-b from-yellow-300 to-yellow-600 w-28 h-28 md:w-36 md:h-36 rounded-[2rem] flex items-center justify-center shadow-[0_0_40px_-10px_rgba(234,179,8,0.6)] border-4 border-yellow-200 relative transform rotate-3 hover:rotate-6 transition-transform">
                            <span class="text-5xl md:text-6xl font-black text-white drop-shadow-lg">{{ player.expLevel }}</span>
                        </div>
                         <div class="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur border border-white/20 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest text-yellow-300">
                             Niveau
                         </div>
                    </div>

                    <div class="flex-1 text-center md:text-left space-y-4">
                        <div>
                            <h1 class="text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 mb-2">
                                {{ player.name }}
                            </h1>
                            <div class="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                <span class="text-slate-400 font-mono font-bold text-lg bg-slate-800/50 px-3 py-1 rounded-lg border border-slate-700/50">{{ player.tag }}</span>
                                <span 
                                    v-if="player.clan" 
                                    @click="openClanModal(player.clan.tag)"
                                    class="flex items-center gap-1.5 text-orange-400 font-bold bg-orange-900/30 px-3 py-1 rounded-lg border border-orange-500/20 cursor-pointer hover:bg-orange-900/50 hover:scale-105 transition-all active:scale-95"
                                >
                                    <Loader2 v-if="loadingClan && selectedClan?.tag === player.clan.tag" class="w-4 h-4 animate-spin text-orange-400" />
                                    <!-- Fallback Icon if Image Fails -->
                                    <Shield v-else-if="hasBadgeError" class="w-5 h-5 fill-orange-400 text-orange-600" />
                                    <!-- Real Image -->
                                    <img 
                                        v-else
                                        :src="getClanBadgeUrl(player.clan.badgeId)" 
                                        class="w-5 h-5 object-contain"
                                        alt="Clan Badge"
                                        @error="handleImageError"
                                    />
                                    {{ player.clan.name }}
                                </span>
                                <span v-if="player.arena" class="flex items-center gap-1.5 text-blue-300 font-bold bg-blue-900/30 px-3 py-1 rounded-lg border border-blue-500/20">
                                    <Target class="w-4 h-4" /> {{ getArenaDetails(player.arena.id || 0, player.arena.name).name }}
                                </span>
                            </div>
                        </div>

                        <!-- Hero Stats -->
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 border-t border-slate-800/50">
                            <div class="text-center md:text-left">
                                <div class="text-3xl font-black text-white">{{ player.trophies }}</div>
                                <div class="text-xs font-bold text-slate-500 uppercase tracking-widest">Trophées</div>
                            </div>
                            <div class="text-center md:text-left">
                                <div class="text-3xl font-black text-white">{{ player.bestTrophies }}</div>
                                <div class="text-xs font-bold text-slate-500 uppercase tracking-widest">Record</div>
                            </div>
                           
                             <div class="text-center md:text-left">
                                <div class="text-3xl font-black text-white">{{ player.wins }}</div>
                                <div class="text-xs font-bold text-slate-500 uppercase tracking-widest">Victoires</div>
                            </div>
                             <div class="text-center md:text-left">
                                <div class="text-3xl font-black text-white">{{ getWinRate(player.wins, player.battleCount) }}</div>
                                <div class="text-xs font-bold text-slate-500 uppercase tracking-widest">Win Rate</div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <!-- Content Grid with "Glass" Feel -->
            <div class="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                <!-- Left Column: Detailed Stats -->
                <div class="xl:col-span-2 space-y-8">
                    <!-- Path of Legends -->
                    <div v-if="rankedStats?.current" class="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 relative overflow-hidden">
                        <div class="absolute top-0 right-0 w-32 h-32 bg-purple-100 rounded-bl-full opacity-50 pointer-events-none"></div>
                        <h3 class="flex items-center gap-3 text-2xl font-black text-slate-800 mb-6 relative z-10">
                            <Trophy class="w-6 h-6 text-purple-600 fill-purple-100" />
                            Voie des Légendes
                        </h3>
                        <div class="grid md:grid-cols-3 gap-6 relative z-10">
                             <div class="bg-purple-50/50 rounded-2xl p-4 border border-purple-100 text-center hover:bg-purple-50 transition-colors">
                                <div class="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">Saison Actuelle</div>
                                <div class="text-3xl font-black text-slate-800 mb-1">Ligue {{ rankedStats.current.leagueNumber }}</div>
                                <div class="text-sm font-medium text-slate-500">{{ rankedStats.current.trophies }} Médailles</div>
                             </div>
                             <div class="bg-white rounded-2xl p-4 border border-slate-100 text-center shadow-sm">
                                <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Saison Précédente</div>
                                <div class="text-2xl font-bold text-slate-700 mb-1">Ligue {{ rankedStats.last?.leagueNumber ?? '-' }}</div>
                                <div class="text-sm text-slate-400">{{ rankedStats.last?.trophies ?? 0 }} Médailles</div>
                             </div>
                             <div class="bg-white rounded-2xl p-4 border border-slate-100 text-center shadow-sm">
                                <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Meilleur Résultat</div>
                                <div class="text-2xl font-bold text-slate-700 mb-1">Ligue {{ rankedStats.best?.leagueNumber ?? '-' }}</div>
                                <div class="text-sm text-slate-400">{{ rankedStats.best?.trophies ?? 0 }} Médailles</div>
                             </div>
                        </div>
                    </div>

                    <!-- Stats Breakdown -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div class="bg-white rounded-3xl p-6 shadow-lg border border-slate-100">
                             <h4 class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Swords class="w-4 h-4" /> Statistiques Combats
                             </h4>
                             <div class="space-y-4">
                                <div class="flex justify-between items-center">
                                    <span class="text-slate-600 font-medium">Total Combats</span>
                                    <span class="font-bold text-slate-900">{{ player.battleCount }}</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-slate-600 font-medium">Victoires 3 Couronnes</span>
                                    <span class="font-bold text-purple-600">{{ player.threeCrownWins }}</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-slate-600 font-medium">Défaites</span>
                                    <span class="font-bold text-rose-500">{{ player.losses }}</span>
                                </div>
                             </div>
                        </div>

                         <div class="bg-white rounded-3xl p-6 shadow-lg border border-slate-100">
                             <h4 class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Sparkles class="w-4 h-4" /> Collection & Dons
                             </h4>
                             <div class="space-y-4">
                                <div class="flex justify-between items-center">
                                    <span class="text-slate-600 font-medium">Cartes Tournoi</span>
                                    <span class="font-bold text-slate-900">{{ player.tournamentCardsWon }}</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-slate-600 font-medium">Cartes Défis</span>
                                    <span class="font-bold text-slate-900">{{ player.challengeCardsWon }}</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-slate-600 font-medium">Total Dons</span>
                                    <span class="font-bold text-green-600">{{ player.totalDonations }}</span>
                                </div>
                             </div>
                        </div>
                    </div>
                    
                    <!-- Goblin Journey -->
                    <div class="bg-gradient-to-br from-emerald-900 to-emerald-800 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
                         <Zap class="absolute -right-6 -bottom-6 w-40 h-40 text-white/5 rotate-12" />
                         <div class="relative z-10 flex justify-between items-center">
                            <div>
                                <h3 class="text-xl font-bold text-emerald-100 mb-1">Merge Tactics</h3>
                                <p class="text-emerald-300/80 text-sm">Progression Spéciale</p>
                            </div>
                            <div class="text-right">
                                <div v-if="goblinProgress">
                                    <div class="text-4xl font-black">{{ goblinProgress.trophies }}</div>
                                    <div class="text-sm font-bold text-emerald-400">{{ goblinProgress.arena?.name }}</div>
                                </div>
                                <div v-else class="text-emerald-400/50 italic text-sm">Non commencé</div>
                            </div>
                         </div>
                    </div>

                </div>

                <!-- Right Column: Deck & Badges -->
                <div class="space-y-8">
                     <!-- Current Deck -->
                    <div class="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
                        <div class="flex items-center justify-between mb-6">
                            <h3 class="text-xl font-black text-slate-800 flex items-center gap-2">
                                <div class="w-2 h-2 bg-blue-500 rounded-full"></div> Deck Actuel
                            </h3>
                            <span class="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-md border border-blue-100">
                                Moy. {{ (player.currentDeck.reduce((acc, c) => acc + (c.elixirCost || 0), 0) / 8).toFixed(1) }}
                            </span>
                        </div>
                        
                        <div class="grid grid-cols-4 gap-3">
                            <div v-for="card in player.currentDeck" :key="card.id" 
                                 class="group relative aspect-[3/4] cursor-pointer"
                                 @click="openCardModal(card)"
                            >
                                <div class="absolute inset-0 bg-slate-100 rounded-xl transform rotate-3 scale-90 opacity-0 group-hover:opacity-100 group-hover:rotate-6 transition-all duration-300"></div>
                                <img :src="card.iconUrls.medium" class="w-full h-full object-contain relative z-10 drop-shadow-md group-hover:-translate-y-1 transition-transform" />
                                
                                <div class="absolute -top-1 -right-1 bg-purple-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold border border-white z-20 shadow-sm">
                                    {{ getElixirCost(card.name) }}
                                </div>
                                <div class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded shadow-sm z-20 border border-slate-600 whitespace-nowrap">
                                    Lvl {{ getCalculatedLevel(card) }}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Badges Grid -->
                    <div v-if="filteredBadges.length" class="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
                        <h3 class="text-xl font-black text-slate-800 flex items-center gap-2 mb-6">
                             <div class="w-2 h-2 bg-yellow-500 rounded-full"></div> Collection
                        </h3>
                        <div class="grid grid-cols-4 gap-4">
                            <div v-for="badge in filteredBadges.slice(0, 16)" :key="badge.name" class="aspect-square bg-slate-50 rounded-xl p-2 flex items-center justify-center border border-slate-100 hover:border-blue-200 transition-colors group cursor-help relative">
                                <img :src="badge.iconUrls.large" class="w-full h-full object-contain grayscale-[0.3] group-hover:grayscale-0 transition-all group-hover:scale-110" />
                                <!-- Tooltip fallback -->
                                <div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-30">
                                    {{ badge.name }} ({{ badge.level }})
                                </div>
                            </div>
                        </div>
                         <div v-if="filteredBadges.length > 16" class="text-center mt-4">
                            <Button @click="openBadgesModal" variant="ghost" size="sm" class="text-xs text-slate-400 font-medium hover:text-slate-600">
                                + {{ filteredBadges.length - 16 }} autres badges
                            </Button>
                        </div>
                    </div>
                </div>

            </div>

        </div>

        <!-- Badges Full Modal -->
        <div v-if="showBadgesModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300" @click.self="closeBadgesModal">
             <div class="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300">
                <!-- Header -->
                <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 class="text-2xl font-black text-slate-800">Tous les Badges</h3>
                    <Button variant="ghost" class="rounded-full w-10 h-10 p-0 hover:bg-slate-200 text-slate-500" @click="closeBadgesModal">
                        <X class="w-6 h-6" />
                    </Button>
                </div>
                <!-- Grid -->
                <div class="p-8 overflow-y-auto grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-6">
                    <div v-for="badge in filteredBadges" :key="badge.name" class="flex flex-col items-center gap-2 group">
                        <div class="relative w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:border-blue-300 group-hover:bg-blue-50 transition-all">
                             <img :src="badge.iconUrls.large" :alt="badge.name" class="w-14 h-14 object-contain drop-shadow-sm group-hover:scale-110 transition-transform" />
                             <div class="absolute -top-2 -right-2 bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-white" v-if="badge.level">
                                 Lvl {{ badge.level }}
                             </div>
                        </div>
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-tight text-center truncate w-full">{{ badge.name }}</div>
                    </div>
                </div>
             </div>
        </div>

        <!-- Clan Modal -->
        <div v-if="showClanModal && selectedClan" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300" @click.self="closeClanModal">
             <div class="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300">
                <!-- Header -->
                <div class="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row gap-6 items-center bg-slate-50/50">
                    <img :src="getClanBadgeUrl(selectedClan.badgeId)" class="w-24 h-24 object-contain drop-shadow-lg" />
                    <div class="flex-1 text-center md:text-left space-y-2">
                        <h3 class="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">{{ selectedClan.name }}</h3>
                        <div class="flex flex-wrap items-center justify-center md:justify-start gap-3">
                            <span class="text-slate-400 font-mono font-bold bg-slate-200/50 px-2 py-1 rounded text-sm">{{ selectedClan.tag }}</span>
                            <span class="flex items-center gap-1.5 text-slate-600 font-bold text-sm bg-slate-100 px-3 py-1 rounded-full">
                                <Globe class="w-3.5 h-3.5" /> {{ selectedClan.location.name }}
                            </span>
                            <span class="flex items-center gap-1.5 text-slate-600 font-bold text-sm bg-slate-100 px-3 py-1 rounded-full">
                                <Users class="w-3.5 h-3.5" /> {{ selectedClan.members }}/50
                            </span>
                        </div>
                        <p class="text-slate-500 text-sm italic max-w-2xl">{{ selectedClan.description }}</p>
                    </div>
                    <div class="flex gap-4">
                        <div class="text-center px-4 py-2 bg-yellow-50 rounded-xl border border-yellow-100">
                             <div class="text-2xl font-black text-slate-800 flex items-center justify-center gap-1">
                                <Trophy class="w-5 h-5 text-yellow-500 fill-yellow-500" /> {{ selectedClan.clanScore }}
                            </div>
                            <div class="text-[10px] font-bold text-yellow-600 uppercase tracking-widest">Score Clan</div>
                        </div>
                         <div class="text-center px-4 py-2 bg-green-50 rounded-xl border border-green-100">
                             <div class="text-2xl font-black text-slate-800">{{ selectedClan.donationsPerWeek }}</div>
                            <div class="text-[10px] font-bold text-green-600 uppercase tracking-widest">Dons / Sem.</div>
                        </div>
                    </div>
                    <Button variant="ghost" class="absolute top-4 right-4 rounded-full w-10 h-10 p-0 hover:bg-slate-200 text-slate-400" @click="closeClanModal">
                        <X class="w-6 h-6" />
                    </Button>
                </div>

                <!-- Members List -->
                <div class="flex-1 overflow-y-auto p-0">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-slate-50 sticky top-0 z-10 shadow-sm text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <tr>
                                <th class="p-4 pl-8">#</th>
                                <th class="p-4">Joueur</th>
                                <th class="p-4 hidden md:table-cell">Rôle</th>
                                <th class="p-4 text-right">Trophées</th>
                                <th class="p-4 pr-8 text-right hidden md:table-cell">Dons</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            <tr v-for="member in selectedClan.memberList" :key="member.tag" 
                                class="group hover:bg-blue-50/50 transition-colors cursor-pointer"
                                @click="handleMemberClick(member.tag)"
                            >
                                <td class="p-4 pl-8 font-mono font-bold text-slate-400 w-16">{{ member.clanRank }}</td>
                                <td class="p-4">
                                    <div class="font-bold text-slate-800 group-hover:text-blue-600 transition-colors text-lg">{{ member.name }}</div>
                                    <div class="flex items-center gap-1.5 text-xs text-slate-400 md:hidden">
                                        <span>{{ member.role === 'leader' ? 'Chef' : member.role === 'coLeader' ? 'Chef Adjoint' : member.role === 'elder' ? 'Aîné' : 'Membre' }}</span>
                                        <span>•</span>
                                        <span>{{ member.donations }} dons</span>
                                    </div>
                                    <div class="text-[10px] text-slate-400 font-mono mt-0.5">{{ member.tag }}</div>
                                </td>
                                <td class="p-4 hidden md:table-cell">
                                    <span :class="{
                                        'px-2 py-1 rounded text-xs font-bold uppercase tracking-wider border': true,
                                        'bg-yellow-100 text-yellow-700 border-yellow-200': member.role === 'leader',
                                        'bg-orange-100 text-orange-700 border-orange-200': member.role === 'coLeader',
                                        'bg-blue-100 text-blue-700 border-blue-200': member.role === 'elder',
                                        'bg-slate-100 text-slate-600 border-slate-200': member.role === 'member'
                                    }">
                                        {{ member.role === 'leader' ? 'Chef' : member.role === 'coLeader' ? 'Chef Adj.' : member.role === 'elder' ? 'Aîné' : 'Membre' }}
                                    </span>
                                </td>
                                <td class="p-4 text-right">
                                    <div class="font-black text-slate-800 flex items-center justify-end gap-1.5">
                                        {{ member.trophies }} <Trophy class="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                    </div>
                                    <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{{ member.arena.name }}</div>
                                </td>
                                <td class="p-4 pr-8 text-right hidden md:table-cell">
                                    <div class="font-bold text-green-600">+{{ member.donations }}</div>
                                    <div class="text-[10px] text-slate-400">Reçus: {{ member.donationsReceived }}</div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
             </div>
        </div>

        <!-- Enhanced Card Modal -->
        <div v-if="selectedCard" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300" @click.self="closeCardModal">
            <div class="bg-gradient-to-b from-slate-800 to-slate-900 rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 relative border border-slate-700/50">
                
                <Button variant="ghost" class="absolute top-4 right-4 rounded-full w-10 h-10 p-0 hover:bg-white/10 text-white/70 hover:text-white z-20 transition-colors" @click="closeCardModal">
                    <X class="w-6 h-6" />
                </Button>

                <!-- Cinematic Header -->
                <div class="relative h-80 flex items-center justify-center bg-slate-900">
                    <div class="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900 z-10"></div>
                    <!-- Glow effect based on rarity -->
                    <div :class="{
                        'opacity-40': true,
                        'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-[80px]': true,
                        'bg-blue-500': selectedCard.rarity === 'common',
                        'bg-orange-500': selectedCard.rarity === 'rare',
                        'bg-purple-500': selectedCard.rarity === 'epic',
                        'bg-teal-400': selectedCard.rarity === 'legendary',
                        'bg-yellow-400': selectedCard.rarity === 'champion'
                    }"></div>
                    
                    <img :src="selectedCard.iconUrls.medium" class="w-64 h-auto drop-shadow-[0_10px_60px_rgba(0,0,0,0.6)] z-10 transform hover:scale-105 transition-transform duration-700 ease-in-out" />
                </div>
                
                <div class="p-8 space-y-6 relative z-20 -mt-16">
                    <div class="text-center space-y-2">
                         <div class="flex items-center justify-center gap-2">
                             <div class="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full border border-white/10 backdrop-blur-md">
                                <Star class="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                <span class="text-xs font-bold uppercase tracking-wider text-white/90">{{ selectedCard.rarity }}</span>
                            </div>
                            <div v-if="selectedCard.evolutionLevel" class="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/20 rounded-full border border-purple-500/30 backdrop-blur-md text-purple-300">
                                <Zap class="w-3 h-3 text-purple-400 fill-purple-400" />
                                <span class="text-xs font-bold uppercase tracking-wider">Évoluée</span>
                            </div>
                        </div>
                        <h3 class="text-3xl font-black text-white tracking-tight">{{ selectedCard.name }}</h3>
                    </div>

                    <div class="grid grid-cols-3 gap-3">
                        <div class="bg-white/5 rounded-2xl p-3 text-center border border-white/5 hover:bg-white/10 transition-colors">
                            <div class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Niveau</div>
                            <div class="text-xl font-black text-white">{{ getCalculatedLevel(selectedCard) }}</div>
                        </div>
                        <div class="bg-white/5 rounded-2xl p-3 text-center border border-white/5 hover:bg-white/10 transition-colors">
                            <div class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Élixir</div>
                            <div class="text-xl font-black text-purple-400 drop-shadow-glow">{{ getElixirCost(selectedCard.name) }}</div>
                        </div>
                         <div class="bg-white/5 rounded-2xl p-3 text-center border border-white/5 hover:bg-white/10 transition-colors">
                            <div class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Évolution</div>
                            <div class="text-xl font-black text-slate-200">{{ selectedCard.evolutionLevel ? 'Oui' : 'Non' }}</div>
                        </div>
                    </div>

                     <!-- Detailed List -->
                    <div class="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-3">
                         <div class="flex justify-between items-center text-xs text-slate-300">
                             <span class="font-medium text-slate-500">Cartes collectées</span>
                             <span class="font-bold font-mono">{{ selectedCard.count }} / {{ selectedCard.maxLevel ? 'MAX' : '?' }}</span>
                         </div>
                          <div class="flex justify-between items-center text-xs text-slate-300">
                             <span class="font-medium text-slate-500">Identifiant</span>
                             <span class="font-bold font-mono text-slate-600">#{{ selectedCard.id }}</span>
                         </div>
                          <div class="flex justify-between items-center text-xs text-slate-300">
                             <span class="font-medium text-slate-500">Niveau Max</span>
                             <span class="font-bold text-yellow-400">{{ selectedCard.maxLevel ? selectedCard.maxLevel + 1 : '15' }}</span>
                         </div>
                          <!-- Note on stats -->
                         <div class="pt-2 mt-2 border-t border-white/5 text-[10px] text-slate-500 text-center italic">
                             * Les statistiques de combat (DPS, PV) ne sont pas disponibles via l'API publique.
                         </div>
                    </div>

                </div>
            </div>
        </div>

    </div>
</template>

<style scoped>
.drop-shadow-glow {
    filter: drop-shadow(0 0 8px rgba(168, 85, 247, 0.4));
}
</style>

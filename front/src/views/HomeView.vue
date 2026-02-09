<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import PlayerStats from '@/components/PlayerStats.vue'
import Leaderboards from '@/components/Leaderboards.vue'
import HowToFindTag from '@/components/HowToFindTag.vue'
import UserMenu from '@/components/UserMenu.vue'
import AppLogo from '@/statics/Logo.png'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { History, X, Clock, Search, Loader2, Trophy, TrendingUp } from 'lucide-vue-next'
import MetaStats from '@/components/MetaStats.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const currentTab = ref<'leaderboards' | 'meta'>('leaderboards')

const router = useRouter()
const route = useRoute()
const playerStatsRef = ref()

const isPlayerLoaded = ref(false)
const searchQuery = ref('')
const searchType = ref<'player' | 'clan'>('player')
const loading = ref(false)
const isFocused = ref(false)

interface HistoryItem {
  tag: string
  name?: string
  type: 'player' | 'clan'
  timestamp: number
}

const searchHistory = ref<HistoryItem[]>(
  JSON.parse(localStorage.getItem('royale_stats_history') || '[]'),
)

const filteredHistory = computed(() => {
  return searchHistory.value
    .filter((item) => item.type === searchType.value)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5) // Last 5 items
})

const addToHistory = (tag: string, type: 'player' | 'clan', name?: string) => {
  const newItem: HistoryItem = { tag: tag.toUpperCase(), type, timestamp: Date.now(), name }
  // Remove duplicates
  const exists = searchHistory.value.findIndex(
    (h) => h.tag === newItem.tag && h.type === newItem.type,
  )
  if (exists !== -1) {
    searchHistory.value.splice(exists, 1)
  }
  searchHistory.value.unshift(newItem)
  localStorage.setItem('royale_stats_history', JSON.stringify(searchHistory.value))
}

const removeFromHistory = (item: HistoryItem) => {
  searchHistory.value = searchHistory.value.filter(
    (h) => h.tag !== item.tag || h.type !== item.type,
  )
  localStorage.setItem('royale_stats_history', JSON.stringify(searchHistory.value))
}

const triggerSearch = async (historyTag?: string) => {
  const tagToSearch = historyTag || searchQuery.value
  if (playerStatsRef.value && tagToSearch) {
    loading.value = true
    isFocused.value = false // Close dropdown
    try {
      let result = null
      if (searchType.value === 'player') {
        result = await playerStatsRef.value.handleSearch(tagToSearch)
      } else {
        result = await playerStatsRef.value.handleClanSearch(tagToSearch)
      }

      if (result) {
        addToHistory(tagToSearch, searchType.value, result.name)
        if (historyTag) {
          searchQuery.value = historyTag // Update input if clicked from history
        }
      }
    } finally {
      loading.value = false
    }
  }
}

const handleBlur = () => {
  setTimeout(() => {
    isFocused.value = false
  }, 200)
}

const goHome = () => {
  searchQuery.value = ''
  if (playerStatsRef.value) {
    playerStatsRef.value.reset()
  }
}

const handleLeaderboardSelection = (tag: string) => {
  searchType.value = 'player'
  searchQuery.value = tag
  triggerSearch()
}
const handleLeaderboardClanSelection = (tag: string) => {
  searchType.value = 'clan'
  searchQuery.value = tag
  triggerSearch()
}

const handleQuickAccessProfile = () => {
  if (authStore.linkedPlayerTag) {
    searchType.value = 'player'
    searchQuery.value = authStore.linkedPlayerTag
    triggerSearch(authStore.linkedPlayerTag)
  }
}

// Handle route query params for deep linking (e.g., from profile page)
onMounted(async () => {
  const searchParam = route.query.search as string | undefined
  const typeParam = route.query.type as 'player' | 'clan' | undefined

  if (searchParam) {
    searchQuery.value = searchParam
    if (typeParam && (typeParam === 'player' || typeParam === 'clan')) {
      searchType.value = typeParam
    }
    // Wait for PlayerStats component to be ready
    await nextTick()
    triggerSearch(searchParam)
    // Clean up URL
    router.replace({ path: '/' })
  }
})
</script>

<template>
  <div
    class="flex flex-col gap-8 px-4 py-6 w-full relative overflow-hidden max-w-[1600px] mx-auto min-h-screen"
  >
    <!-- ... (background) -->
    <div
      class="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-50 to-transparent -z-10"
    />

    <!-- Global Navbar -->
    <header
      class="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 relative z-50 animate-in fade-in slide-in-from-top-4 duration-700"
    >
      <!-- Left: Logo -->
      <div class="flex-shrink-0">
        <img
          :src="AppLogo"
          alt="Royale Stats Logo"
          class="h-16 md:h-20 w-auto object-contain drop-shadow-lg hover:scale-105 transition-transform duration-300 cursor-pointer"
          @click="goHome"
        />
      </div>

      <!-- Center: Search Bar with Integrated Switcher -->
      <div class="flex-1 w-full md:max-w-3xl flex items-center justify-center">
        <div
          class="flex w-full items-center bg-white/90 backdrop-blur-md p-1.5 rounded-2xl shadow-xl shadow-blue-900/5 border border-white/20 transition-all focus-within:ring-4 focus-within:ring-blue-500/10 group"
        >
          <!-- Switcher Integrated -->
          <div class="flex bg-slate-100/80 p-1 rounded-xl mr-2 flex-shrink-0">
            <button
              @click="searchType = 'player'"
              class="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all"
              :class="
                searchType === 'player'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
              "
            >
              Joueur
            </button>
            <button
              @click="searchType = 'clan'"
              class="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all"
              :class="
                searchType === 'clan'
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
              "
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
              @keyup.enter="triggerSearch()"
              @focus="isFocused = true"
              @blur="handleBlur"
            />

            <!-- History Dropdown -->
            <div
              v-if="isFocused && filteredHistory.length > 0"
              class="absolute top-14 left-0 w-full bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-20 animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <div
                class="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 bg-slate-50/50"
              >
                <History class="w-3 h-3" /> Récent
              </div>
              <div
                v-for="item in filteredHistory"
                :key="item.tag"
                @click="triggerSearch(item.tag)"
                class="px-4 py-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between group transition-colors"
              >
                <div class="flex items-center gap-2">
                  <Clock class="w-3.5 h-3.5 text-slate-400" />
                  <div class="flex flex-col">
                    <span
                      class="font-bold text-slate-700 text-sm group-hover:text-blue-600 transition-colors"
                    >
                      {{ item.name || item.tag }}
                    </span>
                    <span
                      v-if="item.name"
                      class="text-[10px] font-mono font-bold text-slate-400 uppercase"
                    >
                      {{ item.tag }}
                    </span>
                  </div>
                </div>
                <button
                  @click.stop="removeFromHistory(item)"
                  class="p-1 rounded-full hover:bg-slate-200 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <X class="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
          <Button
            @click="triggerSearch()"
            :disabled="loading"
            class="flex-shrink-0 rounded-xl h-12 px-6 text-white font-bold tracking-wide shadow-lg active:scale-95 transition-all min-w-[80px]"
            :class="
              searchType === 'player'
                ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                : 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/20'
            "
          >
            <Loader2 v-if="loading" class="w-5 h-5 animate-spin" />
            <span v-else>GO</span>
          </Button>
        </div>
      </div>

      <!-- Right: Auth Buttons or User Menu -->
      <div class="flex items-center gap-3 flex-shrink-0 mr-6">
        <template v-if="authStore.isAuthenticated">
          <Button
            v-if="authStore.hasLinkedPlayer"
            @click="handleQuickAccessProfile"
            class="h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-5 shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
          >
            <svg
              class="w-5 h-5 mr-2"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
            </svg>
            Mon profil CR
          </Button>
          <UserMenu />
        </template>
        <template v-else>
          <router-link to="/login">
            <Button
              variant="ghost"
              class="text-slate-600 h-12 font-bold hover:bg-gray-100 hover:text-slate-900 px-5"
            >
              Connexion
            </Button>
          </router-link>
          <router-link to="/register">
            <Button
              class="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white h-12 cursor-pointer font-bold px-6 shadow-lg shadow-[#DC8F26]/20 active:scale-95 transition-all"
            >
              S'inscrire
            </Button>
          </router-link>
        </template>
      </div>
    </header>

    <!-- View Switcher -->
    <div
      v-if="!isPlayerLoaded"
      class="flex justify-center mb-8 animate-in fade-in slide-in-from-top-2 duration-500"
    >
      <div
        class="bg-white/50 backdrop-blur-sm p-1 rounded-2xl border border-white/50 shadow-sm flex gap-1"
      >
        <button
          @click="currentTab = 'leaderboards'"
          class="px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
          :class="
            currentTab === 'leaderboards'
              ? 'bg-white text-blue-600 shadow-md scale-100'
              : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
          "
        >
          <Trophy class="w-4 h-4" />
          Classements
        </button>
        <button
          @click="currentTab = 'meta'"
          class="px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
          :class="
            currentTab === 'meta'
              ? 'bg-white text-emerald-600 shadow-md scale-100'
              : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
          "
        >
          <TrendingUp class="w-4 h-4" />
          Méta Stats
        </button>
      </div>
    </div>

    <!-- Leaderboards (Home Page) -->
    <Leaderboards
      v-if="!isPlayerLoaded && currentTab === 'leaderboards'"
      @select-player="handleLeaderboardSelection"
      @select-clan="handleLeaderboardClanSelection"
    />

    <!-- Meta Stats View -->
    <MetaStats v-if="!isPlayerLoaded && currentTab === 'meta'" />

    <!-- How To Find Tag Section -->
    <HowToFindTag v-if="!isPlayerLoaded" :type="searchType" />

    <!-- Player Stats -->
    <PlayerStats ref="playerStatsRef" @player-loaded="isPlayerLoaded = $event" />

    <footer class="mt-12 text-center text-xs text-slate-300">
      Clash Royale est une marque de Supercell. Ce site n'est pas affilié à Supercell.
    </footer>
  </div>
</template>

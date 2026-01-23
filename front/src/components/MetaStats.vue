<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchMetaSnapshot, type MetaSnapshot } from '@/services/meta.service'
import { Loader2, TrendingUp, Hash, Trophy } from 'lucide-vue-next'

const loading = ref(true)
const snapshot = ref<MetaSnapshot | null>(null)

// Map card names to rough asset URLs (best effort without full ID mapping)
// In a real app, we would have a proper ID mapping from clash-data-service
// For now, using a generic fallback or trying to map common names
function getCardUrl(cardName: string) {
  // Basic cleaning, lowercase and replace spaces with dashes
  const cleanName = cardName.toLowerCase().replace(/\./g, '').replace(/\s+/g, '-')
  // RoyaleAPI CDN format usually needs proper ID or key
  // Using a placeholder or trying generic name
  return `https://raw.githubusercontent.com/RoyaleAPI/cr-api-assets/master/cards-75/${cleanName}.png`
}

const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement
  if (target) {
    target.src =
      'https://raw.githubusercontent.com/RoyaleAPI/cr-api-assets/master/cards-75/knight.png'
  }
}

onMounted(async () => {
  try {
    snapshot.value = await fetchMetaSnapshot()
  } catch (e) {
    console.error('Failed to load meta snapshot', e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div
    class="w-full max-w-7xl mx-auto px-4 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700"
  >
    <div class="text-center space-y-2 mb-12">
      <h2
        class="text-4xl font-black text-slate-800 tracking-tight flex items-center justify-center gap-3"
      >
        <TrendingUp class="w-10 h-10 text-emerald-500" />
        Méta du Moment
      </h2>
      <p class="text-slate-500 font-medium text-lg">
        Statistiques basées sur {{ snapshot?.totalBattles || 0 }} batailles analysées
      </p>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <Loader2 class="w-12 h-12 animate-spin text-emerald-500" />
    </div>

    <div
      v-else-if="!snapshot || snapshot.topCards.length === 0"
      class="flex flex-col items-center justify-center py-20 text-slate-400 bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-slate-300"
    >
      <Hash class="w-16 h-16 mb-4 opacity-50" />
      <p class="text-lg font-medium">Aucune donnée disponible pour le moment</p>
      <p class="text-sm">Les batailles seront analysées prochainement.</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="(card, index) in snapshot.topCards"
        :key="card.card_name"
        class="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
      >
        <div class="p-4 flex items-center gap-4">
          <div class="relative w-16 h-20 flex-shrink-0">
            <img
              :src="getCardUrl(card.card_name)"
              @error="handleImageError"
              class="w-full h-full object-contain drop-shadow-md group-hover:scale-110 transition-transform duration-300"
            />
            <div
              class="absolute -top-2 -left-2 w-6 h-6 bg-slate-800 text-white rounded-full flex items-center justify-center text-xs font-black border-2 border-white shadow-sm"
            >
              {{ index + 1 }}
            </div>
          </div>

          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-slate-800 text-lg truncate">{{ card.card_name }}</h3>
            <div class="flex items-center gap-4 mt-1">
              <div class="flex flex-col">
                <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wide"
                  >Usage</span
                >
                <span class="font-bold text-slate-600">{{ card.usage_count }}</span>
              </div>
              <div class="flex flex-col">
                <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wide"
                  >Win Rate</span
                >
                <span
                  class="font-bold"
                  :class="card.win_rate >= 50 ? 'text-emerald-500' : 'text-orange-500'"
                >
                  {{ card.win_rate }}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Use Bar Visual -->
        <div class="h-1.5 w-full bg-slate-100 mt-2">
          <div
            class="h-full bg-emerald-500 rounded-r-full"
            :style="{ width: `${card.win_rate}%` }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

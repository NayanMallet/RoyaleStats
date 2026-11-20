<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import {
  fetchGlobalRankings,
  fetchPathOfLegendRankings,
  fetchSeasonRankings,
  type LeaderboardPlayer,
} from '@/services/leaderboards'
import { getClanBadgeUrl, initBadges } from '@/services/badges'
import { describeApiError, type DisplayedError } from '@/composables/useApiError'
import ErrorState from '@/components/ErrorState.vue'
import { ChevronLeft, Shield, Loader2, Medal } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

const emit = defineEmits(['select-player', 'select-clan'])

function selectClan(tag: string) {
  if (!tag) return
  emit('select-clan', tag)
}

type Category = 'ranked' | 'trophy' | 'merge' | '2v2'
const CATEGORIES: Category[] = ['ranked', 'trophy', 'merge', '2v2']
/** Refresh of the rankings while the page stays open. */
const REFRESH_MS = 5 * 60 * 1000

const activeCategory = ref<Category | null>(null)

function selectPlayer(tag: string) {
  emit('select-player', tag)
}

/**
 * One state per ranking: loading, error (with its message and a retry) or loaded, a loaded list
 * being possibly empty. A failing source never shows up as an empty ranking.
 */
interface Board {
  status: 'loading' | 'error' | 'ready'
  players: LeaderboardPlayer[]
  error: DisplayedError | null
}

const loaders: Record<Category, () => Promise<LeaderboardPlayer[]>> = {
  ranked: () => fetchPathOfLegendRankings(20),
  trophy: () => fetchGlobalRankings(),
  merge: () => fetchSeasonRankings('Merge Tactics', 20),
  '2v2': () => fetchSeasonRankings('2v2 League', 20),
}

const emptyBoard = (): Board => ({ status: 'loading', players: [], error: null })
const boards = reactive<Record<Category, Board>>({
  ranked: emptyBoard(),
  trophy: emptyBoard(),
  merge: emptyBoard(),
  '2v2': emptyBoard(),
})

/**
 * Loads one ranking. A background refresh keeps the list already shown when it fails: the
 * error is only displayed when there is nothing else to show.
 */
async function loadBoard(category: Category, { background = false } = {}) {
  const board = boards[category]
  if (!background) {
    board.status = 'loading'
    board.error = null
  }
  try {
    board.players = await loaders[category]()
    board.status = 'ready'
    board.error = null
  } catch (error) {
    if (background && board.status === 'ready') {
      console.warn(`[Leaderboards] Refresh of ${category} failed, keeping the current list`, error)
      return
    }
    board.status = 'error'
    board.error = describeApiError(error)
  }
}

function loadAll(options?: { background?: boolean }) {
  return Promise.all(CATEGORIES.map((category) => loadBoard(category, options)))
}

let refreshTimer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  void initBadges()
  void loadAll()
  refreshTimer = setInterval(() => loadAll({ background: true }), REFRESH_MS)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})

const activeBoard = computed(() => (activeCategory.value ? boards[activeCategory.value] : null))

const getCategoryTitle = computed(() => {
  switch (activeCategory.value) {
    case 'ranked':
      return 'Voie des Légendes'
    case 'trophy':
      return 'Trophées'
    case 'merge':
      return 'Batailles de la Reine'
    case '2v2':
      return 'Ligue 2v2'
    default:
      return ''
  }
})

const getCategoryColor = (cat: Category) => {
  switch (cat) {
    case 'ranked':
      return 'from-purple-600 to-indigo-800'
    case 'trophy':
      return 'from-yellow-400 to-orange-600'
    case 'merge':
      return 'from-emerald-500 to-teal-700'
    case '2v2':
      return 'from-blue-500 to-indigo-600'
    default:
      return 'from-muted-foreground to-foreground'
  }
}
</script>

<template>
  <div class="w-full max-w-7xl mx-auto pb-4 transition-all duration-500">
    <!-- HEADER -->
    <!-- Mobile first: back button above the title, then a centered title between two equal
         columns from sm up (the right column only balances the back button). -->
    <div
      v-if="activeCategory"
      class="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 mb-6 sm:mb-8 px-4"
    >
      <Button
        variant="ghost"
        class="justify-self-start gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl"
        @click="activeCategory = null"
      >
        <ChevronLeft class="w-5 h-5" /> Retour
      </Button>
      <h2
        class="min-w-0 text-xl sm:text-2xl font-black text-foreground uppercase tracking-tight flex items-center justify-center gap-3"
      >
        <img
          :src="
            activeCategory === 'trophy'
              ? 'https://cdns3.royaleapi.com/cdn-cgi/image/w=64,h=64,format=auto/static/img/ui/trophy.png'
              : activeCategory === 'ranked'
                ? 'https://cdns3.royaleapi.com/cdn-cgi/image/w=64,h=64,format=auto/static/img/ui/league10.png'
                : activeCategory === 'merge'
                  ? 'https://cdns3.royaleapi.com/cdn-cgi/image/w=64,h=64,format=auto/static/img/ui/trophy-gm-merge-tactics.png'
                  : 'https://cdns3.royaleapi.com/cdn-cgi/image/w=64,h=64,format=auto/static/img/ui/2v2.png'
          "
          class="w-8 h-8 shrink-0 object-contain"
          alt=""
        />
        {{ getCategoryTitle }}
      </h2>
    </div>

    <div
      v-if="!activeCategory"
      class="text-center space-y-2 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700"
    >
      <h2 class="text-4xl font-black text-foreground tracking-tight">Classements</h2>
      <p class="text-muted-foreground font-medium text-lg">
        Explorez les meilleurs joueurs mondiaux
      </p>
    </div>

    <!-- CATEGORY SELECTION Grid -->
    <div
      v-if="!activeCategory"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-4 max-w-[1400px] mx-auto"
    >
      <!-- Category Card Generator -->
      <div
        v-for="cat in ['ranked', 'trophy', 'merge', '2v2']"
        :key="cat"
        @click="activeCategory = cat as Category"
        class="group relative h-48 rounded-[2rem] overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-2 border-white/20"
      >
        <!-- Background Gradient -->
        <div
          class="absolute inset-0 bg-gradient-to-br transition-all duration-500"
          :class="[getCategoryColor(cat as Category), 'opacity-100']"
        />

        <!-- Decorative Pattern -->
        <div
          class="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/40 to-transparent mix-blend-overlay"
        ></div>

        <!-- Content -->
        <div class="relative z-10 h-full flex flex-col justify-between p-6 text-white text-center">
          <div class="flex justify-center">
            <div
              class="bg-white/20 backdrop-blur-sm p-3 rounded-2xl shadow-inner border border-white/20 group-hover:scale-110 transition-transform duration-300 flex items-center justify-center w-16 h-16"
            >
              <!-- Conditional Icon Rendering -->
              <img
                :src="
                  cat === 'trophy'
                    ? 'https://cdns3.royaleapi.com/cdn-cgi/image/w=64,h=64,format=auto/static/img/ui/trophy.png'
                    : cat === 'ranked'
                      ? 'https://cdns3.royaleapi.com/cdn-cgi/image/w=64,h=64,format=auto/static/img/ui/league10.png'
                      : cat === 'merge'
                        ? 'https://cdns3.royaleapi.com/cdn-cgi/image/w=64,h=64,format=auto/static/img/ui/trophy-gm-merge-tactics.png'
                        : 'https://cdns3.royaleapi.com/cdn-cgi/image/w=64,h=64,format=auto/static/img/ui/2v2.png'
                "
                class="w-10 h-10 object-contain drop-shadow-md"
                alt="Icon"
              />
            </div>
          </div>

          <div>
            <h3 class="text-xl font-black uppercase tracking-wide drop-shadow-lg leading-none mb-1">
              {{
                cat === 'ranked'
                  ? 'Ranked'
                  : cat === 'trophy'
                    ? 'Trophées'
                    : cat === 'merge'
                      ? 'Merge'
                      : '2v2 League'
              }}
            </h3>
            <p class="font-bold opacity-90 uppercase text-[10px] tracking-[0.2em] text-blue-50">
              {{
                cat === 'ranked'
                  ? 'Légendes'
                  : cat === 'trophy'
                    ? 'Global'
                    : cat === 'merge'
                      ? 'Tactics'
                      : 'Duo'
              }}
            </p>
          </div>

          <!-- Action Hint -->
          <div
            class="opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0"
          >
            <span class="text-[10px] font-bold bg-white/20 px-3 py-1 rounded-full backdrop-blur-md"
              >Voir le classement</span
            >
          </div>
        </div>
      </div>
    </div>

    <!-- LEADERBOARD LIST View -->
    <div
      v-else
      class="bg-card/80 backdrop-blur-xl rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl shadow-surface-shadow/50 border border-card/50 overflow-hidden mx-4 animate-in zoom-in-95 duration-300"
    >
      <div
        v-if="activeBoard?.status === 'loading'"
        class="flex justify-center py-32"
        role="status"
        aria-label="Chargement du classement"
      >
        <Loader2 class="w-10 h-10 animate-spin text-info" aria-hidden="true" />
      </div>

      <div v-else-if="activeBoard?.status === 'error' && activeBoard.error" class="p-4 sm:p-8">
        <ErrorState
          v-bind="activeBoard.error"
          title="Classement indisponible"
          @retry="loadBoard(activeCategory!)"
        />
      </div>

      <p
        v-else-if="activeBoard?.players.length === 0"
        class="py-24 px-6 text-center text-muted-foreground font-medium"
      >
        Aucun joueur classé pour le moment dans ce classement.
      </p>

      <!-- One grid for the whole list, each row being a subgrid: the rank and score columns size
           to their widest content and stay aligned with the header. Mobile first: rank, player,
           score; the clan column appears from sm up. -->
      <div
        v-else
        class="grid grid-cols-[auto_minmax(0,1fr)_auto] sm:grid-cols-[auto_minmax(0,3fr)_minmax(0,2fr)_auto]"
      >
        <div
          class="col-span-full grid grid-cols-subgrid gap-x-3 sm:gap-x-4 px-4 sm:px-8 py-4 border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-wider bg-background/50"
        >
          <div class="w-7 text-center">#</div>
          <div>Joueur</div>
          <div class="hidden sm:block">Clan</div>
          <div class="text-right">
            {{ activeCategory === 'ranked' ? 'Médailles' : 'Trophées' }}
          </div>
        </div>

        <div
          v-for="(player, index) in activeBoard?.players ?? []"
          :key="player.tag"
          @click="selectPlayer(player.tag)"
          data-testid="leaderboard-row"
          class="col-span-full grid grid-cols-subgrid gap-x-3 sm:gap-x-4 px-4 sm:px-8 py-4 items-center hover:bg-info-soft/50 transition-colors border-b border-border last:border-0 cursor-pointer group"
        >
          <!-- Rank -->
          <div
            class="w-7 h-7 flex items-center justify-center rounded-lg font-black text-xs"
            :class="
              index < 3
                ? 'bg-warning-soft text-warning border border-warning-border shadow-sm'
                : 'text-muted-foreground bg-accent/50'
            "
          >
            {{ index + 1 }}
          </div>

          <!-- Player Info -->
          <div class="flex items-center gap-3 min-w-0">
            <div
              class="font-bold text-foreground text-base group-hover:text-info transition-colors truncate"
            >
              {{ player.name }}
            </div>
            <span
              v-if="index < 3"
              class="hidden md:inline-flex shrink-0 px-1.5 py-0.5 rounded-md bg-warning-soft text-warning text-[9px] font-bold uppercase tracking-wide border border-warning-border"
              >Top {{ index + 1 }}</span
            >
          </div>

          <!-- Clan Info -->
          <div class="hidden sm:block min-w-0">
            <div
              class="flex max-w-full w-fit items-center gap-2 text-muted-foreground font-medium text-sm group/clan cursor-pointer hover:bg-accent/60 rounded-lg py-1 px-2 -ml-2 transition-all duration-200"
              @click.stop="player.clan ? selectClan(player.clan.tag) : null"
            >
              <img
                v-if="player.clan && (player.clan.badgeUrl || getClanBadgeUrl(player.clan.badgeId))"
                :src="player.clan.badgeUrl || getClanBadgeUrl(player.clan.badgeId!)"
                class="w-5 h-5 shrink-0 object-contain"
                alt=""
              />
              <Shield
                v-else-if="player.clan"
                class="w-3.5 h-3.5 shrink-0 text-muted-foreground group-hover/clan:text-clan transition-colors"
              />
              <span class="truncate group-hover/clan:text-foreground transition-colors">{{
                player.clan?.name || '-'
              }}</span>
            </div>
          </div>

          <!-- Score -->
          <div
            class="flex items-center justify-end gap-1.5 whitespace-nowrap tabular-nums font-black text-base sm:text-lg text-foreground"
          >
            <Medal
              v-if="activeCategory === 'ranked'"
              class="size-5 sm:size-6 shrink-0 text-ranked"
              aria-hidden="true"
            />
            <img
              v-else
              src="https://cdns3.royaleapi.com/cdn-cgi/image/w=64,h=64,format=auto/static/img/ui/trophy.png"
              class="size-5 sm:size-6 shrink-0 object-contain"
              alt=""
            />
            {{ player.score?.toLocaleString() }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

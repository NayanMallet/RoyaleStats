<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Unlink, Loader2, User } from 'lucide-vue-next'
import { linkService, type PlayerLink } from '@/services/link.service'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  link: PlayerLink
}>()

const emit = defineEmits<{
  unlinked: []
}>()

const authStore = useAuthStore()
const loading = ref(false)
const playerName = ref<string | null>(null)
const loadingName = ref(false)

// Fetch player name from Clash Royale API
const fetchPlayerName = async () => {
  loadingName.value = true
  try {
    const tag = props.link.player_tag.replace('#', '')
    const API_GATEWAY_BASE_URL = import.meta.env.VITE_API_GATEWAY_URL ?? 'http://localhost:3000'
    const response = await fetch(`${API_GATEWAY_BASE_URL}/api/clash/players/%23${tag}`)
    if (response.ok) {
      const data = await response.json()
      playerName.value = data.name
    }
  } catch (error) {
    console.error('Error fetching player name:', error)
  } finally {
    loadingName.value = false
  }
}

const handleUnlink = async () => {
  if (!confirm('Êtes-vous sûr de vouloir dissocier ce compte ?')) {
    return
  }

  loading.value = true
  try {
    await linkService.deleteLink()
    authStore.setLinkedPlayerTag(null)
    emit('unlinked')
  } catch (error) {
    console.error('Error unlinking:', error)
    alert('Erreur lors de la dissociation du compte')
  } finally {
    loading.value = false
  }
}



onMounted(() => {
  fetchPlayerName()
})
</script>

<template>
  <Card class="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
    <CardHeader>
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-3">
          <div class="p-3 bg-blue-600 rounded-xl shadow-lg">
            <User class="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle class="text-blue-900">Compte Clash Royale lié</CardTitle>
            <CardDescription>Accès rapide à votre profil</CardDescription>
          </div>
        </div>
      </div>
    </CardHeader>

    <CardContent class="space-y-4">
      <div class="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-blue-100">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-semibold text-slate-600 mb-1">Joueur</p>
            <p v-if="loadingName" class="text-lg font-bold text-blue-900 flex items-center gap-2">
              <Loader2 class="w-4 h-4 animate-spin" />
              Chargement...
            </p>
            <p v-else-if="playerName" class="text-lg font-bold text-blue-900">
              {{ playerName }}
            </p>
            <p v-else class="text-lg font-bold text-blue-900">{{ link.player_tag }}</p>
            <p class="text-xs font-mono text-slate-500 mt-0.5">{{ link.player_tag }}</p>
          </div>
        </div>
      </div>

      <div class="flex justify-end">
        <Button
          @click="handleUnlink"
          :disabled="loading"
          variant="outline"
          class="h-11 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold"
        >
          <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
          <Unlink v-else class="w-4 h-4 mr-2" />
          <span v-if="!loading">Dissocier</span>
        </Button>
      </div>

      <p class="text-xs text-slate-500 text-center">
        Lié le {{ new Date(link.linked_at).toLocaleDateString('fr-FR') }}
      </p>
    </CardContent>
  </Card>
</template>

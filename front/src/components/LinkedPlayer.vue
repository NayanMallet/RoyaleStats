<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Unlink, Loader2, User, Twitter, Twitch, Edit2, Save, X } from 'lucide-vue-next'
import { linkService, type PlayerLink } from '@/services/link.service'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'vue-sonner'

const props = defineProps<{
  link: PlayerLink
}>()

const emit = defineEmits<{
  unlinked: []
  updated: []
}>()

const authStore = useAuthStore()
const loading = ref(false)
const playerName = ref<string | null>(null)
const loadingName = ref(false)
const isEditing = ref(false)
const twitterHandle = ref(props.link.twitter || '')
const twitchHandle = ref(props.link.twitch || '')

// Helper to format handles (remove @ if present)
const formatHandle = (handle: string) => {
  return handle.trim().replace(/^@/, '')
}

const handleSaveSocials = async () => {
  loading.value = true
  try {
    const twitter = twitterHandle.value ? formatHandle(twitterHandle.value) : undefined
    const twitch = twitchHandle.value ? formatHandle(twitchHandle.value) : undefined
    
    // If empty string, send empty string to clear it, or undefined if not changed
    // Actually we should send empty string if we want to clear it
    
    await linkService.updateLink(
      twitterHandle.value ? formatHandle(twitterHandle.value) : '', 
      twitchHandle.value ? formatHandle(twitchHandle.value) : ''
    )
    
    // Update local props roughly by emitting an event to refresh or just assuming success
    //Ideally we should emit an update event or refresh the parent
    // For now let's just update the local state if we had a way, but props are readonly
    // So we will emit a 'updated' event
    emit('updated')
    isEditing.value = false
    toast.success('Réseaux sociaux mis à jour !')
  } catch (error) {
    console.error('Error updating socials:', error)
    toast.error('Erreur lors de la mise à jour')
  } finally {
    loading.value = false
  }
}

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


      <!-- Social Links Section -->
      <div v-if="!isEditing" class="flex items-center gap-4 bg-white/50 p-3 rounded-xl border border-blue-50">
        <div class="flex-1 flex gap-3">
          <!-- Twitter -->
          <a
            v-if="link.twitter"
            :href="`https://twitter.com/${link.twitter}`"
            target="_blank"
            class="flex items-center gap-2 px-3 py-1.5 bg-[#1DA1F2]/10 text-[#1DA1F2] rounded-lg hover:bg-[#1DA1F2]/20 transition-colors"
          >
            <Twitter class="w-4 h-4" />
            <span class="text-sm font-medium">@{{ link.twitter }}</span>
          </a>
          <!-- Twitch -->
          <a
            v-if="link.twitch"
            :href="`https://twitch.tv/${link.twitch}`"
            target="_blank"
            class="flex items-center gap-2 px-3 py-1.5 bg-[#9146FF]/10 text-[#9146FF] rounded-lg hover:bg-[#9146FF]/20 transition-colors"
          >
            <Twitch class="w-4 h-4" />
            <span class="text-sm font-medium">{{ link.twitch }}</span>
          </a>
          <span v-if="!link.twitter && !link.twitch" class="text-sm text-slate-400 italic">
            Aucun réseau social lié
          </span>
        </div>
        <Button
          @click="isEditing = true"
          variant="ghost"
          size="sm"
          class="h-8 w-8 p-0 rounded-full hover:bg-blue-100 text-blue-600"
        >
          <Edit2 class="w-4 h-4" />
        </Button>
      </div>

      <!-- Edit Socials Form -->
      <div v-else class="bg-white p-4 rounded-xl border border-blue-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div class="flex items-center justify-between mb-2">
          <h4 class="text-sm font-bold text-slate-700">Modifier les réseaux</h4>
          <Button
            @click="isEditing = false"
            variant="ghost"
            size="sm"
            class="h-6 w-6 p-0 hover:bg-slate-100 rounded-full"
          >
            <X class="w-3 h-3 text-slate-500" />
          </Button>
        </div>
        
        <div class="space-y-3">
          <div class="space-y-1">
            <Label class="text-xs text-slate-500 font-bold uppercase">Twitter</Label>
            <div class="relative">
              <Twitter class="w-4 h-4 text-[#1DA1F2] absolute left-3 top-2.5" />
              <Input 
                v-model="twitterHandle" 
                placeholder="@pseudo" 
                class="pl-9 h-9 bg-slate-50 border-slate-200 focus:border-[#1DA1F2] focus:ring-[#1DA1F2]/20" 
              />
            </div>
          </div>
          
          <div class="space-y-1">
            <Label class="text-xs text-slate-500 font-bold uppercase">Twitch</Label>
            <div class="relative">
              <Twitch class="w-4 h-4 text-[#9146FF] absolute left-3 top-2.5" />
              <Input 
                v-model="twitchHandle" 
                placeholder="pseudo" 
                class="pl-9 h-9 bg-slate-50 border-slate-200 focus:border-[#9146FF] focus:ring-[#9146FF]/20" 
              />
            </div>
          </div>
        </div>

        <div class="flex justify-end pt-2">
          <Button 
            @click="handleSaveSocials" 
            :disabled="loading"
            class="h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
          >
            <Loader2 v-if="loading" class="w-3.5 h-3.5 animate-spin mr-2" />
            <Save v-else class="w-3.5 h-3.5 mr-2" />
            Enregistrer
          </Button>
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

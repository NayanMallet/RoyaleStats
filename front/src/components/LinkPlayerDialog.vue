<script setup lang="ts">
import { ref, useId } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Link as LinkIcon, Loader2, AlertCircle } from 'lucide-vue-next'
import { linkService } from '@/services/link.service'
import { ApiError } from '@/services/http'
import { useAuthStore } from '@/stores/auth'

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  close: []
  linked: [playerTag: string]
}>()

const authStore = useAuthStore()
const playerTag = ref('')
const loading = ref(false)
const error = ref('')

const normalizeTag = (tag: string) => {
  let normalized = tag.trim().toUpperCase()
  if (!normalized.startsWith('#')) {
    normalized = '#' + normalized
  }
  return normalized
}

const handleLink = async () => {
  if (!playerTag.value.trim()) {
    error.value = 'Veuillez saisir un tag de joueur'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const normalized = normalizeTag(playerTag.value)
    const link = await linkService.createLink(normalized)
    authStore.setLinkedPlayerTag(link.player_tag)
    emit('linked', link.player_tag)
    emit('close')
    playerTag.value = ''
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      error.value = 'Joueur introuvable dans Clash Royale'
    } else if (err instanceof ApiError && err.status === 409) {
      error.value = 'Ce tag est déjà lié à un autre compte'
    } else {
      error.value = 'Une erreur est survenue. Veuillez réessayer.'
    }
  } finally {
    loading.value = false
  }
}

const handleClose = () => {
  if (!loading.value) {
    playerTag.value = ''
    error.value = ''
    emit('close')
  }
}

// Accessible name of the dialog and label of the tag field.
const titleId = useId()
const tagId = useId()
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="titleId"
    @click.self="handleClose"
    @keydown.esc="handleClose"
  >
    <Card class="w-full max-w-md bg-card shadow-2xl animate-in zoom-in-95 duration-200">
      <CardHeader class="relative">
        <button
          type="button"
          @click="handleClose"
          :disabled="loading"
          aria-label="Fermer"
          class="absolute right-4 top-4 p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
        >
          <X class="w-4 h-4 text-muted-foreground" aria-hidden="true" />
        </button>
        <div class="flex items-center gap-3">
          <div class="p-3 bg-info-soft rounded-xl">
            <LinkIcon class="w-6 h-6 text-info" />
          </div>
          <div>
            <CardTitle :id="titleId">Lier mon compte Clash Royale</CardTitle>
            <CardDescription>Connectez votre SupercellID pour un accès rapide</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent class="space-y-4">
        <div class="space-y-2">
          <label :for="tagId" class="text-sm font-semibold text-foreground">Tag du joueur</label>
          <Input
            :id="tagId"
            v-model="playerTag"
            placeholder="#TAG (ex: #2PP)"
            :disabled="loading"
            class="h-12 text-base"
            @keyup.enter="handleLink"
          />
          <p class="text-xs text-muted-foreground">
            Vous trouverez votre tag dans Clash Royale, dans votre profil
          </p>
        </div>

        <div
          v-if="error"
          class="p-3 bg-destructive/10 border border-destructive/25 rounded-lg flex items-start gap-2"
        >
          <AlertCircle class="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
          <p class="text-sm text-destructive">{{ error }}</p>
        </div>

        <div class="flex gap-3 pt-2">
          <Button
            @click="handleClose"
            variant="outline"
            :disabled="loading"
            class="flex-1 h-12 rounded-xl"
          >
            Annuler
          </Button>
          <Button
            @click="handleLink"
            :disabled="loading"
            class="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Loader2 v-if="loading" class="w-4 h-4 animate-spin mr-2" />
            <LinkIcon v-else class="w-4 h-4 mr-2" />
            {{ loading ? 'Liaison...' : 'Lier mon compte' }}
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

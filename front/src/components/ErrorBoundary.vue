<script setup lang="ts">
import { onErrorCaptured, ref, watch, type ComponentPublicInstance } from 'vue'
import { useRoute } from 'vue-router'
import { Home, RefreshCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import ErrorState from '@/components/ErrorState.vue'

/**
 * Catches the errors thrown while rendering the current view, so that a crash shows a
 * fallback screen instead of a blank page. Placed around <RouterView> in App.vue.
 */
const captured = ref<{ error: unknown; component?: string; info: string } | null>(null)
const route = useRoute()

onErrorCaptured((error: unknown, instance: ComponentPublicInstance | null, info: string) => {
  const component = instance?.$options.name ?? instance?.$options.__name
  captured.value = { error, component, info }
  console.error(`[ErrorBoundary] ${component ?? 'Component'} failed (${info})`, error)
  // Stop the propagation: the error is handled here, not by app.config.errorHandler.
  return false
})

// Navigating to another page gives it a fresh start.
watch(
  () => route.fullPath,
  () => {
    captured.value = null
  },
)

function debugText(): string | undefined {
  if (!captured.value) return undefined
  const { error, component, info } = captured.value
  const stack = error instanceof Error ? (error.stack ?? error.message) : String(error)
  return `Composant : ${component ?? 'inconnu'} (${info})\n\n${stack}`
}

function reload() {
  window.location.reload()
}
</script>

<template>
  <div v-if="captured" class="flex min-h-[60vh] items-center justify-center p-4">
    <ErrorState
      title="Cette page a rencontré un problème"
      message="Rechargez la page. Si le problème continue, revenez à l’accueil."
      :debug="debugText()"
    >
      <template #actions>
        <Button @click="reload">
          <RefreshCw aria-hidden="true" />
          Recharger
        </Button>
        <Button variant="outline" as-child>
          <RouterLink to="/">
            <Home aria-hidden="true" />
            Retour à l’accueil
          </RouterLink>
        </Button>
      </template>
    </ErrorState>
  </div>
  <slot v-else />
</template>

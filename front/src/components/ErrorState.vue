<script setup lang="ts">
import { AlertTriangle, RotateCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Error shown in place of content that could not load: title, message, incident code and an
 * action. Fed by describeApiError() (composables/useApiError.ts) for API errors.
 */
const props = withDefaults(
  defineProps<{
    title?: string
    message: string
    /** requestId of the failed request, to give to the team. */
    incidentCode?: string
    /** Shows the "Réessayer" button, which emits `retry`. */
    retryable?: boolean
    retryLabel?: string
    /** Stack or technical detail, displayed in development only. */
    debug?: string
  }>(),
  { title: 'Une erreur est survenue', retryable: false, retryLabel: 'Réessayer' },
)

defineEmits<{ retry: [] }>()

const isDev = import.meta.env.DEV
</script>

<template>
  <Card role="alert" class="mx-auto w-full max-w-xl border-destructive/40">
    <CardHeader class="items-center text-center">
      <div
        class="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive"
        aria-hidden="true"
      >
        <AlertTriangle class="size-6" />
      </div>
      <CardTitle>{{ props.title }}</CardTitle>
      <CardDescription class="text-base">{{ props.message }}</CardDescription>
    </CardHeader>

    <CardContent class="flex flex-col items-center gap-4">
      <p v-if="props.incidentCode" class="text-xs text-muted-foreground">
        Code incident :
        <code class="select-all break-all rounded bg-muted px-1.5 py-0.5 font-mono">{{
          props.incidentCode
        }}</code>
      </p>

      <div v-if="props.retryable || $slots.actions" class="flex flex-wrap justify-center gap-2">
        <Button v-if="props.retryable" @click="$emit('retry')">
          <RotateCw aria-hidden="true" />
          {{ props.retryLabel }}
        </Button>
        <slot name="actions" />
      </div>

      <details v-if="isDev && props.debug" class="w-full text-left text-xs">
        <summary class="cursor-pointer text-muted-foreground">Détails techniques (DEV)</summary>
        <pre
          class="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-3 font-mono"
          >{{ props.debug }}</pre
        >
      </details>
    </CardContent>
  </Card>
</template>

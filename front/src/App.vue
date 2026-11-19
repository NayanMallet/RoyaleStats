<script setup lang="ts">
import ErrorBoundary from '@/components/ErrorBoundary.vue'
import { Toaster } from '@/components/ui/sonner'
</script>

<template>
  <main
    class="min-h-screen bg-background text-foreground font-sans selection:bg-info-soft selection:text-info"
  >
    <ErrorBoundary>
      <RouterView />
    </ErrorBoundary>
    <Toaster rich-colors position="top-center" />
  </main>
</template>

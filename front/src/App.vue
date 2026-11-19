<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner'
</script>

<template>
  <main
    class="min-h-screen bg-background text-foreground font-sans selection:bg-info-soft selection:text-info"
  >
    <RouterView />
    <Toaster rich-colors position="top-center" />
  </main>
</template>

<script setup lang="ts">
import { Moon, Sun } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()
</script>

<template>
  <Button
    type="button"
    variant="outline"
    size="icon-lg"
    :aria-label="themeStore.isDark ? 'Activer le thème clair' : 'Activer le thème sombre'"
    :title="themeStore.isDark ? 'Activer le thème clair' : 'Activer le thème sombre'"
    :aria-pressed="themeStore.isDark"
    @click="themeStore.toggleTheme"
  >
    <Sun v-if="themeStore.isDark" aria-hidden="true" />
    <Moon v-else aria-hidden="true" />
  </Button>
</template>

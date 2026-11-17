import { computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { usePreferredDark, useStorage } from '@vueuse/core'

export const useThemeStore = defineStore('theme', () => {
  // Keep this key in sync with the early theme initialization in index.html.
  const preference = useStorage<'auto' | 'light' | 'dark'>('royale_stats_theme', 'auto')
  const prefersDark = usePreferredDark()
  const isDark = computed(() =>
    preference.value === 'light' ? false : preference.value === 'dark' || prefersDark.value,
  )

  watch(isDark, (dark) => document.documentElement.classList.toggle('dark', dark), {
    immediate: true,
    flush: 'sync',
  })

  function toggleTheme() {
    preference.value = isDark.value ? 'light' : 'dark'
  }

  return { isDark, toggleTheme }
})

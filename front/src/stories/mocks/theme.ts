/**
 * Applies the theme picked in the Storybook toolbar ("Thème") before a story renders.
 * It goes through the real theme store, like ThemeToggle does, so the store, localStorage
 * and the `.dark` class on <html> stay consistent.
 */
import type { Pinia } from 'pinia'
import { useThemeStore } from '@/stores/theme'

export type Theme = 'light' | 'dark'

export function applyTheme(pinia: Pinia, theme: Theme = 'light'): void {
  const store = useThemeStore(pinia)
  if (store.isDark !== (theme === 'dark')) store.toggleTheme()
}

import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { defineComponent, h } from 'vue'
import { expect, within } from 'storybook/test'
import ErrorBoundary from '@/components/ErrorBoundary.vue'

const CrashingView = defineComponent({
  name: 'CrashingView',
  setup() {
    return () => {
      throw new Error('Cannot read properties of undefined (reading "cards")')
    }
  },
})

const HealthyView = defineComponent({
  name: 'HealthyView',
  setup: () => () => h('p', { class: 'p-4' }, 'La vue s’affiche normalement.'),
})

/**
 * Entoure `<RouterView>` dans `App.vue` : une exception au rendu d'une vue affiche un écran de
 * repli au lieu d'une page blanche. Le détail technique n'apparaît qu'en développement.
 */
const meta = {
  title: 'Organisms/ErrorBoundary',
  component: ErrorBoundary,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ErrorBoundary>

export default meta
type Story = StoryObj<typeof meta>

export const Healthy: Story = {
  render: () => ({
    components: { ErrorBoundary, HealthyView },
    template: '<ErrorBoundary><HealthyView /></ErrorBoundary>',
  }),
}

/** Un composant lève une exception au rendu : écran de repli, Recharger et retour à l'accueil. */
export const ViewCrashed: Story = {
  render: () => ({
    components: { ErrorBoundary, CrashingView },
    template: '<ErrorBoundary><CrashingView /></ErrorBoundary>',
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText('Cette page a rencontré un problème')).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: 'Recharger' })).toBeInTheDocument()
    await expect(canvas.getByRole('link', { name: /Retour à l’accueil/ })).toBeInTheDocument()
  },
}

export const ViewCrashedGerard: Story = {
  ...ViewCrashed,
  globals: { viewport: { value: 'gerardUsable', isRotated: false } },
}

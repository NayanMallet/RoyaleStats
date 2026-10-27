import type { Meta, StoryObj } from '@storybook/vue3-vite'
import MetaStats from '@/components/MetaStats.vue'
import type { MockRoute } from '../mocks/api'
import { demoMetaSnapshot, emptyMetaSnapshot } from '../mocks/fixtures'

const snapshot = (body: unknown, extra: Partial<MockRoute> = {}): MockRoute[] => [
  { url: '/api/meta/snapshot', body, ...extra },
]

/** Cartes les plus jouées et leur taux de victoire (persona Sacha, stats et gamification). */
const meta = {
  title: 'Organisms/MetaStats',
  component: MetaStats,
  parameters: { layout: 'fullscreen', mockApi: snapshot({ snapshot: demoMetaSnapshot }) },
} satisfies Meta<typeof MetaStats>

export default meta
type Story = StoryObj<typeof meta>

export const Loaded: Story = {}

export const Loading: Story = {
  parameters: { mockApi: snapshot({ snapshot: demoMetaSnapshot }, { delay: Infinity }) },
}

export const Empty: Story = {
  parameters: { mockApi: snapshot({ snapshot: emptyMetaSnapshot }) },
}

/**
 * Le meta-service renvoie une erreur : aujourd'hui le composant affiche l'état « vide ».
 * À faire évoluer avec RST-33 (Error Management) pour distinguer « pas de données » et « erreur ».
 */
export const ServerError: Story = {
  parameters: { mockApi: snapshot({ error: 'Internal Server Error' }, { status: 500 }) },
}

export const Loaded800x600: Story = {
  globals: { viewport: { value: 'gerard800x600', isRotated: false } },
}

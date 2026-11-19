import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, within } from 'storybook/test'
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
 * Le meta-service renvoie une 500 : un état d'erreur distinct de « Aucune donnée », avec le code
 * incident et un bouton Réessayer qui relance le chargement.
 */
export const ServerError: Story = {
  parameters: {
    mockApi: snapshot(
      {
        error: 'InternalServerError',
        message: 'Une erreur interne est survenue.',
        statusCode: 500,
        requestId: '6f1c9e2a-3b7d-4c1e-9a2f-1d2e3f4a5b6c',
      },
      { status: 500 },
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText('Impossible de charger la méta')).toBeInTheDocument()
    await expect(canvas.getByText('6f1c9e2a-3b7d-4c1e-9a2f-1d2e3f4a5b6c')).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
  },
}

/** Le meta-service est arrêté (503) : message « Service momentanément indisponible ». */
export const ServiceUnavailable: Story = {
  parameters: {
    mockApi: snapshot(
      { error: 'ServiceUnavailable', message: 'Service indisponible.', statusCode: 503 },
      { status: 503 },
    ),
  },
}

export const Loaded800x600: Story = {
  globals: { viewport: { value: 'gerard800x600', isRotated: false } },
}

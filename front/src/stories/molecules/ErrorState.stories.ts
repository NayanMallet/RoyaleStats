import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import ErrorState from '@/components/ErrorState.vue'

/**
 * Erreur affichée à la place d'un contenu qui n'a pas pu charger : titre, message, code incident
 * et action. Alimentée par `describeApiError()` (table HTTP → UX de l'Epic RST-32).
 * Molécule : Card, Button et icône, sans appel à l'API.
 */
const meta = {
  title: 'Molecules/ErrorState',
  component: ErrorState,
  args: {
    title: 'Service indisponible',
    message: 'Service momentanément indisponible, réessayez dans un instant.',
    incidentCode: '6f1c9e2a-3b7d-4c1e-9a2f-1d2e3f4a5b6c',
    retryable: true,
    onRetry: fn(),
  },
} satisfies Meta<typeof ErrorState>

export default meta
type Story = StoryObj<typeof meta>

/** 502, 503 ou 504 : message générique, code incident et bouton Réessayer. */
export const ServiceUnavailable: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Réessayer' }))
    await expect(args.onRetry).toHaveBeenCalledOnce()
  },
}

/** Erreur réseau ou délai dépassé : pas de code incident, la requête n'a jamais atteint l'API. */
export const NetworkError: Story = {
  args: {
    title: 'Service injoignable',
    message: 'Connexion impossible. Vérifiez votre connexion puis réessayez.',
    incidentCode: undefined,
  },
}

/** 500 en développement : le détail technique est repliable sous le message. */
export const WithDebugDetails: Story = {
  args: {
    title: 'Erreur interne',
    message: 'Une erreur interne est survenue.',
    debug: 'Error: no such table: card_stats\n    at getMetaSnapshot (metaController.ts:12:5)',
  },
}

/** 4xx : message métier, rien à réessayer. */
export const NotRetryable: Story = {
  args: {
    title: 'Action impossible',
    message: 'Ce tag est déjà associé à un autre compte.',
    retryable: false,
  },
}

export const Gerard800x600: Story = {
  args: WithDebugDetails.args,
  globals: { viewport: { value: 'gerardUsable', isRotated: false } },
}

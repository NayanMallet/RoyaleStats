import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, within } from 'storybook/test'
import Leaderboards from '@/components/Leaderboards.vue'
import { longPathOfLegendRankings } from '../mocks/fixtures'
import { leaderboardsRoutes } from '../mocks/routes'

/**
 * Classements de l'accueil : quatre catégories, puis la liste des meilleurs joueurs.
 * Organisme branché sur l'API Gateway (Clash Royale) et sur RoyaleAPI.
 */
const meta = {
  title: 'Organisms/Leaderboards',
  component: Leaderboards,
  parameters: { layout: 'fullscreen', mockApi: leaderboardsRoutes() },
} satisfies Meta<typeof Leaderboards>

export default meta
type Story = StoryObj<typeof meta>

export const Categories: Story = {}

/** Opens the « Ranked » category and waits for the list. */
async function openPathOfLegend(canvasElement: HTMLElement, firstPlayer: string) {
  const canvas = within(canvasElement)
  await userEvent.click(await canvas.findByText('Ranked'))
  await expect(
    await canvas.findByRole('heading', { name: /Voie des Légendes/ }),
  ).toBeInTheDocument()
  await expect(await canvas.findByText(firstPlayer)).toBeInTheDocument()
}

/**
 * No horizontal scroll (Gérard persona, docs/GUIDELINES.md) and every cell of the list stays
 * inside its row: the score column used to overflow its grid track and be cut off by the card.
 */
async function expectNoHorizontalOverflow(canvasElement: HTMLElement) {
  const root = canvasElement.ownerDocument.documentElement
  await expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth)
  const rows = within(canvasElement).getAllByTestId('leaderboard-row')
  for (const row of rows) {
    const rowBox = row.getBoundingClientRect()
    for (const cell of Array.from(row.children)) {
      await expect(cell.scrollWidth).toBeLessThanOrEqual(cell.clientWidth)
      await expect(cell.getBoundingClientRect().right).toBeLessThanOrEqual(rowBox.right)
    }
  }
}

/** Ouvre la catégorie « Ranked » et vérifie le titre de la liste et le premier joueur. */
export const PathOfLegend: Story = {
  play: async ({ canvasElement }) => {
    await openPathOfLegend(canvasElement, 'Mohamed Light')
    await expectNoHorizontalOverflow(canvasElement)
  },
}

/** Liste « Voie des Légendes » sur la surface utile de Gérard : aucun défilement horizontal. */
export const PathOfLegendGerard: Story = {
  ...PathOfLegend,
  globals: { viewport: { value: 'gerardUsable', isRotated: false } },
}

/** Liste « Voie des Légendes » sur le mobile de Karim : rang, joueur et médailles, sans le clan. */
export const PathOfLegendKarim: Story = {
  ...PathOfLegend,
  globals: { viewport: { value: 'karimMobile', isRotated: false } },
}

/** Noms et clans longs, scores à six chiffres : les textes sont tronqués, le score reste entier. */
export const PathOfLegendLongNames: Story = {
  parameters: { mockApi: leaderboardsRoutes({}, { pathOfLegend: longPathOfLegendRankings }) },
  play: async ({ canvasElement }) => {
    await openPathOfLegend(canvasElement, 'Mohamed Light le Magnifique')
    await expectNoHorizontalOverflow(canvasElement)
  },
}

export const Loading: Story = {
  parameters: { mockApi: leaderboardsRoutes({ delay: Infinity }) },
}

const UNAVAILABLE = {
  status: 503,
  body: {
    error: 'ServiceUnavailable',
    message: 'Service momentanément indisponible.',
    statusCode: 503,
    requestId: '6f1c9e2a-3b7d-4c1e-9a2f-1d2e3f4a5b6c',
  },
}

/** Opens a category from its card. */
async function openCategory(canvasElement: HTMLElement, label: string) {
  await userEvent.click(await within(canvasElement).findByText(label))
}

/**
 * L'API ne répond pas : la catégorie ouverte affiche une erreur avec son code incident et un
 * bouton Réessayer, jamais une liste vide (RST-11).
 */
export const ServerError: Story = {
  parameters: { mockApi: leaderboardsRoutes(UNAVAILABLE) },
  play: async ({ canvasElement }) => {
    await openCategory(canvasElement, 'Ranked')
    const canvas = within(canvasElement)
    await expect(await canvas.findByText('Classement indisponible')).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: /Réessayer/ })).toBeInTheDocument()
    await expect(canvas.getByText('6f1c9e2a-3b7d-4c1e-9a2f-1d2e3f4a5b6c')).toBeInTheDocument()
    await expect(canvas.queryByTestId('leaderboard-row')).not.toBeInTheDocument()
  },
}

/** RoyaleAPI seul est en panne : le classement Trophées l'indique, les autres restent servis. */
export const TrophyRankingDown: Story = {
  parameters: { mockApi: leaderboardsRoutes({}, { trophies: UNAVAILABLE }) },
  play: async ({ canvasElement }) => {
    await openCategory(canvasElement, 'Trophées')
    const canvas = within(canvasElement)
    await expect(await canvas.findByText('Classement indisponible')).toBeInTheDocument()

    await userEvent.click(canvas.getByRole('button', { name: /Retour/ }))
    await openPathOfLegend(canvasElement, 'Mohamed Light')
  },
}

/** Classement de saison réel (Merge Tactics), lu sur le dernier classement publié par l'API. */
export const SeasonRanking: Story = {
  play: async ({ canvasElement }) => {
    await openCategory(canvasElement, 'Merge')
    await expect(await within(canvasElement).findByText('Ronaldo CR')).toBeInTheDocument()
  },
}

/** Aucun classement publié pour la saison : un message le dit, sans données inventées. */
export const EmptySeason: Story = {
  parameters: { mockApi: leaderboardsRoutes({}, { seasons: { items: [] } }) },
  play: async ({ canvasElement }) => {
    await openCategory(canvasElement, '2v2 League')
    const canvas = within(canvasElement)
    await expect(
      await canvas.findByText('Aucun joueur classé pour le moment dans ce classement.'),
    ).toBeInTheDocument()
    await expect(canvas.queryByTestId('leaderboard-row')).not.toBeInTheDocument()
  },
}

export const Gerard800x600: Story = {
  globals: { viewport: { value: 'gerardUsable', isRotated: false } },
}

export const KarimMobile: Story = {
  globals: { viewport: { value: 'karimMobile', isRotated: false } },
}

import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, within } from 'storybook/test'
import Leaderboards from '@/components/Leaderboards.vue'
import type { MockRoute } from '../mocks/api'
import {
  demoPathOfLegendRankings,
  demoSeasonLeaderboards,
  demoTrophyRankings,
  longPathOfLegendRankings,
} from '../mocks/fixtures'

const rankingsApi = (
  extra: Partial<MockRoute> = {},
  pathOfLegend: unknown = demoPathOfLegendRankings,
): MockRoute[] => [
  {
    url: '/api/clash/locations/global/pathoflegend/players',
    body: pathOfLegend,
    ...extra,
  },
  { url: '/api/royaleapi/players/level/16', body: demoTrophyRankings, ...extra },
  { url: '/api/clash/leaderboards', body: demoSeasonLeaderboards, ...extra },
  // Season rankings left empty: the component then derives Merge and 2v2 from Path of Legend.
  { url: /^\/api\/clash\/leaderboard\/\d+/, body: { items: [] }, ...extra },
  // Clan badge names, loaded once from GitHub by services/badges.ts and cached for the session:
  // never delayed nor failed, otherwise every later story would wait for it.
  { url: /alliance_badges\.json$/, body: [] },
]

/**
 * Classements de l'accueil : quatre catégories, puis la liste des meilleurs joueurs.
 * Organisme branché sur l'API Gateway (Clash Royale) et sur RoyaleAPI.
 */
const meta = {
  title: 'Organisms/Leaderboards',
  component: Leaderboards,
  parameters: { layout: 'fullscreen', mockApi: rankingsApi() },
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
  parameters: { mockApi: rankingsApi({}, longPathOfLegendRankings) },
  play: async ({ canvasElement }) => {
    await openPathOfLegend(canvasElement, 'Mohamed Light le Magnifique')
    await expectNoHorizontalOverflow(canvasElement)
  },
}

export const Loading: Story = {
  parameters: { mockApi: rankingsApi({ delay: Infinity }) },
}

/**
 * L'API ne répond pas : les catégories restent affichées mais leurs listes sont vides,
 * sans message d'erreur. À faire évoluer avec RST-33 (Error Management).
 */
export const ServerError: Story = {
  parameters: { mockApi: rankingsApi({ status: 500, body: { error: 'Internal Server Error' } }) },
}

export const Gerard800x600: Story = {
  globals: { viewport: { value: 'gerardUsable', isRotated: false } },
}

export const KarimMobile: Story = {
  globals: { viewport: { value: 'karimMobile', isRotated: false } },
}

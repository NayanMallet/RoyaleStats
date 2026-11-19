import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, within } from 'storybook/test'
import HomeView from '@/views/HomeView.vue'
import type { MockRoute } from '../mocks/api'
import { demoMetaSnapshot, demoPlayerProfile, demoSoloPlayerProfile } from '../mocks/fixtures'
import { leaderboardsRoutes, playerRoutes } from '../mocks/routes'

// Key read and written by HomeView for the search history (5 last tags per type).
const HISTORY_KEY = 'royale_stats_history'

const homeRoutes: MockRoute[] = [
  ...leaderboardsRoutes(),
  { url: '/api/meta/snapshot', body: { snapshot: demoMetaSnapshot } },
  ...playerRoutes(),
  ...playerRoutes({ profile: demoSoloPlayerProfile, link: null }),
]

/**
 * Page d'accueil réelle (src/views/HomeView.vue) : barre de recherche joueur / clan,
 * onglets « Classements » et « Méta Stats », aide pour trouver son tag, puis la fiche du
 * joueur (PlayerStats) une fois la recherche lancée.
 */
const meta = {
  title: 'Pages/HomePage',
  component: HomeView,
  parameters: { layout: 'fullscreen', mockApi: homeRoutes },
  // Searches made by the play functions must not show up in the history of the next story.
  beforeEach: () => {
    localStorage.removeItem(HISTORY_KEY)
    return () => localStorage.removeItem(HISTORY_KEY)
  },
} satisfies Meta<typeof HomeView>

export default meta
type Story = StoryObj<typeof meta>

/** Visiteur non connecté : classements affichés par défaut. */
export const Leaderboards: Story = {}

/** Onglet « Méta Stats » : cartes les plus jouées et leur taux de victoire. */
export const MetaTab: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole('button', { name: /Méta Stats/ }))
    await expect(
      await canvas.findByText(demoMetaSnapshot.topCards[0]!.card_name),
    ).toBeInTheDocument()
  },
}

/** Recherche d'un tag : la fiche du joueur remplace les classements. */
export const SearchPlayer: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByPlaceholderText('#TAG Joueur'), demoSoloPlayerProfile.tag)
    await userEvent.click(canvas.getByRole('button', { name: 'GO' }))
    await expect(
      await canvas.findByRole('heading', { name: demoSoloPlayerProfile.name }),
    ).toBeInTheDocument()
    await expect(canvas.queryByRole('button', { name: /Classements/ })).not.toBeInTheDocument()
  },
}

/** Utilisateur connecté avec un compte lié : « Mon profil CR » ouvre directement sa fiche. */
export const LinkedUser: Story = {
  parameters: { auth: 'linked' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole('button', { name: /Mon profil CR/ }))
    await expect(
      await canvas.findByRole('heading', { name: demoPlayerProfile.name }),
    ).toBeInTheDocument()
  },
}

export const Gerard800x600: Story = {
  globals: { viewport: { value: 'gerardUsable', isRotated: false } },
}

export const KarimMobile: Story = {
  globals: { viewport: { value: 'karimMobile', isRotated: false } },
}

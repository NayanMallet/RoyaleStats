import { onMounted, ref } from 'vue'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import PlayerStats from '@/components/PlayerStats.vue'
import { demoPlayerProfile, demoSoloPlayerProfile } from '../mocks/fixtures'
import { playerRoutes } from '../mocks/routes'

interface PlayerStatsArgs {
  /** Tag searched once the component is mounted, as HomeView does through `handleSearch`. */
  playerTag: string
  onPlayerLoaded: (loaded: boolean) => void
}

/**
 * Fiche d'un joueur : bandeau (niveau, clan, arène, réseaux sociaux), Voie des Légendes,
 * statistiques, Merge Tactics, deck actuel et badges. Les fenêtres du clan, d'une carte et
 * de tous les badges s'ouvrent depuis la fiche.
 *
 * Le composant n'a pas de props : HomeView appelle `handleSearch(tag)` (exposé) après la
 * recherche. Les stories font de même au montage, avec le tag de l'argument `playerTag`.
 */
const meta = {
  title: 'Organisms/PlayerStats',
  component: PlayerStats,
  args: { playerTag: demoPlayerProfile.tag, onPlayerLoaded: fn() },
  argTypes: { playerTag: { control: false } },
  parameters: { layout: 'fullscreen', mockApi: playerRoutes() },
  render: (args) => ({
    components: { PlayerStats },
    setup() {
      const stats = ref<InstanceType<typeof PlayerStats> | null>(null)
      onMounted(() => stats.value?.handleSearch(args.playerTag))
      return { args, stats }
    },
    template: '<PlayerStats ref="stats" class="py-6" @player-loaded="args.onPlayerLoaded" />',
  }),
} satisfies Meta<PlayerStatsArgs>

export default meta
type Story = StoryObj<typeof meta>

/** Joueur classé, membre d'un clan, compte lié à RoyaleStats avec Twitter et Twitch. */
export const Loaded: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      await canvas.findByRole('heading', { name: demoPlayerProfile.name }),
    ).toBeInTheDocument()
    await expect(canvas.getByTitle('Twitch')).toHaveAttribute('href', 'https://twitch.tv/karimcr')
    await waitFor(() => expect(args.onPlayerLoaded).toHaveBeenCalledWith(true))
  },
}

/** Joueur sans clan ni compte RoyaleStats : pas de Voie des Légendes, de badges ni de réseaux. */
export const SoloPlayer: Story = {
  args: { playerTag: demoSoloPlayerProfile.tag },
  parameters: { mockApi: playerRoutes({ profile: demoSoloPlayerProfile, link: null }) },
}

/**
 * Profil en cours de récupération : le composant n'affiche rien, c'est le bouton « GO » de
 * HomeView qui porte le spinner. À faire évoluer avec RST-33 (Error Management).
 */
export const Loading: Story = {
  parameters: { mockApi: playerRoutes({ player: { delay: Infinity } }) },
}

/**
 * Tag inconnu de l'API Clash Royale (404) : la fiche reste vide et un toast invite à vérifier
 * le tag. Erreur attendue, donc rien dans la console.
 */
export const PlayerNotFound: Story = {
  parameters: {
    mockApi: playerRoutes({ player: { status: 404, body: { error: 'Player not found' } } }),
  },
  play: async ({ args, canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    await expect(await page.findByText('Joueur introuvable : vérifiez le tag.')).toBeInTheDocument()
    await expect(args.onPlayerLoaded).not.toHaveBeenCalledWith(true)
  },
}

/** Le clash-data-service ne répond pas (503) : le toast donne le code d'erreur et invite à réessayer. */
export const ServerError: Story = {
  parameters: {
    mockApi: playerRoutes({ player: { status: 503, body: { error: 'Service Unavailable' } } }),
  },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    await expect(await page.findByText(/erreur 503/)).toBeInTheDocument()
  },
}

/** Clic sur une carte du deck : la fenêtre de détail affiche son nom, son niveau et son coût. */
export const CardDetails: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const [firstCard] = await canvas.findAllByText('Lvl 15')
    await userEvent.click(firstCard!)
    await expect(await canvas.findByRole('heading', { name: 'Hog Rider' })).toBeInTheDocument()
    await expect(canvas.getByText('Élixir')).toBeInTheDocument()
  },
}

/** Clic sur le clan du bandeau : la fenêtre du clan liste ses membres et leur rôle. */
export const ClanMembers: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByText(demoPlayerProfile.clan!.name))
    await expect(await canvas.findByText('Score Clan')).toBeInTheDocument()
    await expect(canvas.getByText('Sacha')).toBeInTheDocument()
  },
}

/** Plus de 16 badges : le bouton « autres badges » ouvre la collection complète. */
export const AllBadges: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole('button', { name: /autres badges/ }))
    await expect(
      await canvas.findByRole('heading', { name: 'Tous les Badges' }),
    ).toBeInTheDocument()
  },
}

export const Gerard800x600: Story = {
  globals: { viewport: { value: 'gerardUsable', isRotated: false } },
}

export const KarimMobile: Story = {
  globals: { viewport: { value: 'karimMobile', isRotated: false } },
}

import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { fn } from 'storybook/test'
import LinkedPlayer from '@/components/LinkedPlayer.vue'
import type { MockRoute } from '../mocks/api'
import { demoLink, demoLinkWithoutSocials } from '../mocks/fixtures'

const playerName: MockRoute = {
  url: /^\/api\/clash\/players\/%232PP8VJ9Q$/,
  body: { tag: demoLink.player_tag, name: 'KarimDuClan' },
}

/** Carte du compte Clash Royale lié au profil : nom du joueur, réseaux sociaux, dissociation. */
const meta = {
  title: 'Organisms/LinkedPlayer',
  component: LinkedPlayer,
  args: { link: demoLink, onUnlinked: fn(), onUpdated: fn() },
  parameters: {
    auth: 'linked',
    mockApi: [
      playerName,
      { method: 'PATCH', url: '/api/link/1', body: demoLink },
      { method: 'DELETE', url: '/api/link/1', status: 204 },
    ],
  },
  decorators: [() => ({ template: '<div class="max-w-md"><story /></div>' })],
} satisfies Meta<typeof LinkedPlayer>

export default meta
type Story = StoryObj<typeof meta>

export const WithSocials: Story = {}

export const WithoutSocials: Story = { args: { link: demoLinkWithoutSocials } }

/** Le nom du joueur est en cours de récupération auprès de l'API Clash Royale. */
export const LoadingPlayerName: Story = {
  parameters: { mockApi: [{ ...playerName, delay: Infinity }] },
}

/** L'API Clash Royale ne répond pas : on retombe sur le tag (dégradation gracieuse). */
export const ClashApiDown: Story = {
  parameters: { mockApi: [{ ...playerName, status: 503, body: { error: 'Unavailable' } }] },
}

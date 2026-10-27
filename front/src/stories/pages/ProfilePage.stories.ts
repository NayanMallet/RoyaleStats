import type { Meta, StoryObj } from '@storybook/vue3-vite'
import ProfileView from '@/views/ProfileView.vue'
import type { MockRoute } from '../mocks/api'
import { demoLink, demoUser } from '../mocks/fixtures'

const linkedRoutes: MockRoute[] = [
  { url: '/api/link/1', body: demoLink },
  {
    url: /^\/api\/clash\/players\/%232PP8VJ9Q$/,
    body: { tag: demoLink.player_tag, name: 'KarimDuClan' },
  },
  { method: 'PUT', url: '/api/users/me', body: demoUser },
]

/** Page profil réelle (src/views/ProfileView.vue) : infos du compte + compte Clash Royale lié. */
const meta = {
  title: 'Pages/Profile',
  component: ProfileView,
  parameters: { layout: 'fullscreen', auth: 'linked', mockApi: linkedRoutes },
} satisfies Meta<typeof ProfileView>

export default meta
type Story = StoryObj<typeof meta>

export const WithLinkedAccount: Story = {}

export const WithoutLinkedAccount: Story = {
  parameters: {
    auth: 'user',
    mockApi: [
      { url: '/api/link/1', status: 404, body: { error: 'Not found' } },
      { method: 'PUT', url: '/api/users/me', body: demoUser },
    ],
  },
}

export const Gerard800x600: Story = {
  globals: { viewport: { value: 'gerardUsable', isRotated: false } },
}

export const KarimMobile: Story = {
  globals: { viewport: { value: 'karimMobile', isRotated: false } },
}

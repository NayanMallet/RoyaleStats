import type { Meta, StoryObj } from '@storybook/vue3-vite'
import RegisterView from '@/views/RegisterView.vue'
import { demoUser } from '../mocks/fixtures'

/** Page d'inscription réelle (src/views/RegisterView.vue). */
const meta = {
  title: 'Pages/Register',
  component: RegisterView,
  parameters: {
    layout: 'fullscreen',
    mockApi: [{ method: 'POST', url: '/api/users/register', status: 201, body: demoUser }],
  },
} satisfies Meta<typeof RegisterView>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Gerard800x600: Story = {
  globals: { viewport: { value: 'gerardUsable', isRotated: false } },
}

export const KarimMobile: Story = {
  globals: { viewport: { value: 'karimMobile', isRotated: false } },
}

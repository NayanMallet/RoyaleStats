import type { Meta, StoryObj } from '@storybook/vue3-vite'
import UserMenu from '@/components/UserMenu.vue'

/**
 * Menu de l'utilisateur connecté (avatar + liste déroulante).
 * Molécule : un déclencheur (atome Avatar dans un Button) + une liste d'actions.
 */
const meta = {
  title: 'Molecules/UserMenu',
  component: UserMenu,
  parameters: { auth: 'user' },
  decorators: [() => ({ template: '<div class="flex justify-end p-4 min-h-64"><story /></div>' })],
} satisfies Meta<typeof UserMenu>

export default meta
type Story = StoryObj<typeof meta>

export const LoggedIn: Story = {}

import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { Label } from '@/components/ui/label'

/** Libellé de champ. Toujours relié à son champ via `for` pour les lecteurs d'écran. */
const meta = {
  title: 'Atoms/Label',
  component: Label,
  render: (args) => ({
    components: { Label },
    setup: () => ({ args }),
    template: '<Label v-bind="args">Adresse e-mail</Label>',
  }),
} satisfies Meta<typeof Label>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { args: { for: 'email' } }

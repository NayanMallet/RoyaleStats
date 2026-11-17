import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { action } from 'storybook/actions'
import { Loader2, Search } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

/**
 * Bouton du design system (shadcn-vue). Toutes les actions de l'application passent par lui.
 */
const meta = {
  title: 'Atoms/Button',
  component: Button,
  args: { variant: 'default', size: 'default' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: { control: 'select', options: ['default', 'sm', 'lg', 'icon', 'icon-sm', 'icon-lg'] },
  },
  render: (args) => ({
    components: { Button },
    setup: () => ({ args, onClick: action('click') }),
    template: '<Button v-bind="args" @click="onClick">Rechercher</Button>',
  }),
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Destructive: Story = { args: { variant: 'destructive' } }

export const Outline: Story = { args: { variant: 'outline' } }

export const Ghost: Story = { args: { variant: 'ghost' } }

export const Disabled: Story = { args: { disabled: true } as Story['args'] }

/** Icône + libellé : le libellé reste visible pour Gérard, l'icône aide Karim sur mobile. */
export const WithIcon: Story = {
  render: (args) => ({
    components: { Button, Search },
    setup: () => ({ args }),
    template: '<Button v-bind="args"><Search /> Rechercher</Button>',
  }),
}

/** État de chargement utilisé pendant les appels API (bouton désactivé + spinner). */
export const Loading: Story = {
  render: (args) => ({
    components: { Button, Loader2 },
    setup: () => ({ args }),
    template:
      '<Button v-bind="args" disabled><Loader2 class="animate-spin" /> Chargement…</Button>',
  }),
}

export const AllVariants: Story = {
  render: () => ({
    components: { Button },
    setup: () => ({
      variants: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const,
    }),
    template: `
      <div class="flex flex-wrap gap-3">
        <Button v-for="variant in variants" :key="variant" :variant="variant">{{ variant }}</Button>
      </div>`,
  }),
}

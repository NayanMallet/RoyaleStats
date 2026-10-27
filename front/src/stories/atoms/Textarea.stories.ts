import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { Textarea } from '@/components/ui/textarea'

const meta = {
  title: 'Atoms/Textarea',
  component: Textarea,
  render: (args) => ({
    components: { Textarea },
    setup: () => ({ args }),
    template: '<Textarea v-bind="args" class="max-w-md" />',
  }),
} satisfies Meta<typeof Textarea>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {
  args: {
    placeholder: 'Décrivez le problème rencontré…',
    'aria-label': 'Description',
  } as Story['args'],
}

export const Filled: Story = {
  args: {
    defaultValue: 'La page profil ne charge pas mon deck depuis ce matin.',
    'aria-label': 'Description',
  } as Story['args'],
}

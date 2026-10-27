import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { Input } from '@/components/ui/input'

/** Champ texte du design system, utilisé pour la recherche de tag et les formulaires. */
const meta = {
  title: 'Atoms/Input',
  component: Input,
  render: (args) => ({
    components: { Input },
    setup: () => {
      const value = ref(args.modelValue ?? '')
      return { args, value }
    },
    template: '<Input v-bind="args" v-model="value" class="max-w-sm" />',
  }),
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {
  args: { placeholder: '#TAG du joueur', 'aria-label': 'Tag du joueur' } as Story['args'],
}

export const Filled: Story = {
  args: { modelValue: '#2PP8VJ9Q', 'aria-label': 'Tag du joueur' } as Story['args'],
}

export const Invalid: Story = {
  args: {
    modelValue: '#???',
    'aria-invalid': true,
    'aria-label': 'Tag du joueur',
  } as Story['args'],
}

export const Disabled: Story = {
  args: { modelValue: '#2PP8VJ9Q', disabled: true, 'aria-label': 'Tag du joueur' } as Story['args'],
}

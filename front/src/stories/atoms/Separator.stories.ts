import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { Separator } from '@/components/ui/separator'

const meta = {
  title: 'Atoms/Separator',
  component: Separator,
  args: { orientation: 'horizontal' },
  argTypes: { orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] } },
  render: (args) => ({
    components: { Separator },
    setup: () => ({ args }),
    template: `
      <div :class="args.orientation === 'vertical' ? 'flex h-6 items-center gap-3' : 'max-w-sm space-y-3'">
        <span class="text-sm">Classement</span>
        <Separator v-bind="args" />
        <span class="text-sm">Méta</span>
      </div>`,
  }),
} satisfies Meta<typeof Separator>

export default meta
type Story = StoryObj<typeof meta>

export const Horizontal: Story = {}

export const Vertical: Story = { args: { orientation: 'vertical' } }

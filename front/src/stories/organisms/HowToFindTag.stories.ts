import type { Meta, StoryObj } from '@storybook/vue3-vite'
import HowToFindTag from '@/components/HowToFindTag.vue'

/** Tutoriel en 3 étapes pour trouver son tag (joueur ou clan) dans le jeu. */
const meta = {
  title: 'Organisms/HowToFindTag',
  component: HowToFindTag,
  args: { type: 'player' },
  argTypes: { type: { control: 'inline-radio', options: ['player', 'clan'] } },
} satisfies Meta<typeof HowToFindTag>

export default meta
type Story = StoryObj<typeof meta>

export const Player: Story = {}

export const Clan: Story = { args: { type: 'clan' } }

/** Vérification persona Gérard : les 3 étapes doivent rester lisibles sans scroll horizontal. */
export const Player800x600: Story = {
  globals: { viewport: { value: 'gerard800x600', isRotated: false } },
}

import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, within } from 'storybook/test'
import ThemeToggle from '@/components/ThemeToggle.vue'

/**
 * Bascule entre thème clair et thème sombre ; le choix est mémorisé dans le navigateur.
 * Molécule : un atome Button et une icône, reliés au store `theme`.
 * Le thème de départ suit le sélecteur « Thème » de la barre d'outils.
 */
const meta = {
  title: 'Molecules/ThemeToggle',
  component: ThemeToggle,
} satisfies Meta<typeof ThemeToggle>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = {
  globals: { theme: 'light' },
}

export const Dark: Story = {
  globals: { theme: 'dark' },
}

/** Un clic passe en thème sombre : le libellé accessible et la classe `.dark` suivent. */
export const Toggle: Story = {
  globals: { theme: 'light' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button', { name: 'Activer le thème sombre' })

    await userEvent.click(button)

    await expect(button).toHaveAccessibleName('Activer le thème clair')
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(document.documentElement).toHaveClass('dark')
  },
}

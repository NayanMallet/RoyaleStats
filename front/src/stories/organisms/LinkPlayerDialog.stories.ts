import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import LinkPlayerDialog from '@/components/LinkPlayerDialog.vue'
import type { MockRoute } from '../mocks/api'
import { demoLink } from '../mocks/fixtures'

const createLink = (status: number, body: unknown): MockRoute[] => [
  { method: 'POST', url: '/api/link', status, body, delay: 300 },
]

/**
 * Fenêtre de liaison d'un compte Clash Royale.
 * Les stories « erreur » rejouent la saisie (play function) pour afficher chaque message.
 */
const meta = {
  title: 'Organisms/LinkPlayerDialog',
  component: LinkPlayerDialog,
  args: { show: true, onClose: fn(), onLinked: fn() },
  parameters: { auth: 'user', layout: 'fullscreen', mockApi: createLink(201, demoLink) },
} satisfies Meta<typeof LinkPlayerDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {}

const submitTag = async (canvasElement: HTMLElement, tag: string) => {
  const canvas = within(canvasElement)
  await userEvent.type(canvas.getByPlaceholderText(/#TAG/), tag)
  await userEvent.click(canvas.getByRole('button', { name: /Lier mon compte/ }))
}

export const Success: Story = {
  play: async ({ args, canvasElement }) => {
    await submitTag(canvasElement, '2pp8vj9q')
    // The tag is normalised (# + uppercase) before being sent.
    await waitFor(() => expect(args.onLinked).toHaveBeenCalledWith('#2PP8VJ9Q'))
  },
}

export const PlayerNotFound: Story = {
  parameters: { mockApi: createLink(404, { error: 'Player not found' }) },
  play: async ({ canvasElement }) => {
    await submitTag(canvasElement, '#NOPE')
    await expect(
      await within(canvasElement).findByText('Joueur introuvable dans Clash Royale'),
    ).toBeVisible()
  },
}

export const TagAlreadyLinked: Story = {
  parameters: { mockApi: createLink(409, { error: 'Conflict' }) },
  play: async ({ canvasElement }) => {
    await submitTag(canvasElement, '#2PP8VJ9Q')
    await expect(
      await within(canvasElement).findByText('Ce tag est déjà lié à un autre compte'),
    ).toBeVisible()
  },
}

export const ServerError: Story = {
  parameters: { mockApi: createLink(500, { error: 'Internal Server Error' }) },
  play: async ({ canvasElement }) => {
    await submitTag(canvasElement, '#2PP8VJ9Q')
    await expect(
      await within(canvasElement).findByText('Une erreur est survenue. Veuillez réessayer.'),
    ).toBeVisible()
  },
}

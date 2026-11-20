import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import LoginView from '@/views/LoginView.vue'
import type { MockRoute } from '../mocks/api'
import { demoLink, demoUser } from '../mocks/fixtures'

const login = (status: number, body: unknown): MockRoute => ({
  method: 'POST',
  url: '/api/users/login',
  status,
  body,
  delay: 300,
})

/** Page de connexion réelle (src/views/LoginView.vue) branchée sur des réponses d'API simulées. */
const meta = {
  title: 'Pages/Login',
  component: LoginView,
  parameters: {
    layout: 'fullscreen',
    mockApi: [
      login(200, { token: 'storybook-token', user: demoUser }),
      { url: '/api/link/1', body: demoLink },
    ],
  },
} satisfies Meta<typeof LoginView>

export default meta
type Story = StoryObj<typeof meta>

const fillAndSubmit = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement)
  await userEvent.type(canvas.getByLabelText('Email'), demoUser.email)
  await userEvent.type(canvas.getByLabelText('Mot de passe'), 'motdepasse')
  await userEvent.click(canvas.getByRole('button', { name: /Se connecter/ }))
}

export const Default: Story = {}

export const RequiredFields: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: /Se connecter/ }))
    const message = await canvas.findByText("L'email est requis")
    // The view fades in when it mounts: the message is visible once that animation is over.
    await waitFor(() => expect(message).toBeVisible())
  },
}

export const InvalidCredentials: Story = {
  parameters: { mockApi: [login(401, { error: 'Invalid credentials' })] },
  play: async ({ canvasElement }) => {
    await fillAndSubmit(canvasElement)
    const messages = await within(canvasElement).findAllByText('Email ou mot de passe incorrect')
    await expect(messages).toHaveLength(2)
  },
}

export const ServerError: Story = {
  parameters: {
    mockApi: [
      login(503, {
        error: 'ServiceUnavailable',
        message: 'Service indisponible',
        statusCode: 503,
        requestId: 'f2c1a9e0-login',
      }),
    ],
  },
  play: async ({ canvasElement }) => {
    await fillAndSubmit(canvasElement)
    await expect(
      await within(canvasElement).findByText(
        'Service momentanément indisponible, réessayez dans un instant.',
      ),
    ).toBeInTheDocument()
  },
}

/** Trop de tentatives : le message de l'API (limitation de débit) est affiché tel quel. */
export const TooManyAttempts: Story = {
  parameters: {
    mockApi: [
      login(429, {
        error: 'RateLimited',
        message: 'Trop de requêtes, réessayez dans quelques secondes.',
        statusCode: 429,
      }),
    ],
  },
  play: async ({ canvasElement }) => {
    await fillAndSubmit(canvasElement)
    await expect(
      await within(canvasElement).findByText('Trop de requêtes, réessayez dans quelques secondes.'),
    ).toBeInTheDocument()
  },
}

export const Gerard800x600: Story = {
  globals: { viewport: { value: 'gerardUsable', isRotated: false } },
}

export const KarimMobile: Story = {
  globals: { viewport: { value: 'karimMobile', isRotated: false } },
}

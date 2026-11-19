import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { setup, type Preview } from '@storybook/vue3-vite'
import { MINIMAL_VIEWPORTS } from 'storybook/viewport'
import { Toaster } from '@/components/ui/sonner'
import { installFetchMock, type MockRoute } from '@/stories/mocks/api'
import { applyAuthState, type AuthState } from '@/stories/mocks/auth'
import { applyTheme, type Theme } from '@/stories/mocks/theme'
import 'vue-sonner/style.css'
import '@/style.css'

// Same plugins as src/main.ts. The router uses an in-memory history so that stories
// never change the Storybook URL; the routes only need to exist for useRouter()/RouterLink.
const pinia = createPinia()
const Blank = { render: () => null }
const router = createRouter({
  history: createMemoryHistory(),
  routes: ['/', '/login', '/register', '/profile'].map((path) => ({ path, component: Blank })),
})

setup((app) => {
  app.use(pinia)
  app.use(router)
})

const preview: Preview = {
  tags: ['autodocs'],

  // Light/dark switch in the toolbar, same themes as the app (.dark class on <html>).
  globalTypes: {
    theme: {
      description: 'Thème de l’application',
      toolbar: {
        title: 'Thème',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Clair', icon: 'sun' },
          { value: 'dark', title: 'Sombre', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },

  // Runs before each story: theme, auth state and API mocks declared by the story,
  // the fetch mock being restored afterwards.
  beforeEach: ({ globals, parameters }) => {
    applyTheme(pinia, globals.theme as Theme | undefined)
    applyAuthState(pinia, parameters.auth as AuthState | undefined)
    return installFetchMock((parameters.mockApi as MockRoute[] | undefined) ?? [])
  },

  decorators: [
    // Theme colors on the wrapper too: on Docs pages, stories render on Storybook's own background.
    // vue-sonner needs a <Toaster /> in the tree to display toast() calls.
    () => ({
      components: { Toaster },
      template: `
        <div class="bg-background text-foreground">
          <story />
          <Toaster rich-colors position="top-center" />
        </div>`,
    }),
  ],

  parameters: {
    layout: 'padded',
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    options: {
      storySort: {
        order: ['Introduction', 'Atoms', 'Molecules', 'Organisms', 'Templates', 'Pages'],
      },
    },
    // Persona viewports (docs/PERSONAS.md): Gérard's 800×600 screen and Karim's phone.
    viewport: {
      options: {
        gerard800x600: {
          name: 'Gérard — écran 800×600',
          styles: { width: '800px', height: '600px' },
          type: 'desktop',
        },
        gerardUsable: {
          name: 'Gérard — surface utile 780×470',
          styles: { width: '780px', height: '470px' },
          type: 'desktop',
        },
        karimMobile: {
          name: 'Karim — mobile 393×851',
          styles: { width: '393px', height: '851px' },
          type: 'mobile',
        },
        ...MINIMAL_VIEWPORTS,
      },
    },
    a11y: {
      // 'todo' reports violations in the panel without failing; switch to 'error' once fixed.
      test: 'todo',
    },
  },
}

export default preview

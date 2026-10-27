import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { Search } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import UserMenu from '@/components/UserMenu.vue'

/**
 * Gabarit de l'accueil : en-tête (logo, recherche, menu utilisateur), onglets, grille de contenu.
 * La grille reçoit les organismes Leaderboards, MetaStats ou PlayerStats selon le contexte.
 */
const meta = {
  title: 'Templates/DashboardTemplate',
  parameters: { layout: 'fullscreen', auth: 'user' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => ({
    components: {
      Button,
      Card,
      CardHeader,
      CardContent,
      InputGroup,
      InputGroupAddon,
      InputGroupButton,
      InputGroupInput,
      Search,
      UserMenu,
    },
    template: `
      <div class="min-h-screen bg-slate-50">
        <header class="flex items-center gap-4 border-b bg-white px-4 py-3">
          <div class="size-10 shrink-0 rounded-xl bg-slate-200" role="img" aria-label="[Logo]"></div>
          <InputGroup class="max-w-xl flex-1">
            <InputGroupAddon><Search /></InputGroupAddon>
            <InputGroupInput placeholder="[Recherche joueur / clan]" aria-label="Recherche" />
            <InputGroupAddon align="inline-end">
              <InputGroupButton variant="default">[Rechercher]</InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <div class="ml-auto"><UserMenu /></div>
        </header>
        <nav class="flex gap-2 px-4 pt-4" aria-label="Onglets">
          <Button>[Onglet actif]</Button>
          <Button variant="outline">[Onglet]</Button>
        </nav>
        <main class="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
          <Card v-for="index in 6" :key="index">
            <CardHeader><div class="h-5 w-1/2 rounded bg-slate-200"></div></CardHeader>
            <CardContent class="space-y-2">
              <div class="h-4 w-full rounded bg-slate-100"></div>
              <div class="h-4 w-2/3 rounded bg-slate-100"></div>
            </CardContent>
          </Card>
        </main>
      </div>`,
  }),
}

export const Gerard800x600: Story = {
  ...Default,
  globals: { viewport: { value: 'gerardUsable', isRotated: false } },
}

export const KarimMobile: Story = {
  ...Default,
  globals: { viewport: { value: 'karimMobile', isRotated: false } },
}

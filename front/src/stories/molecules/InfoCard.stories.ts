import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { Trophy } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

/** Carte d'information : titre + description + contenu + actions. Base des blocs de stats. */
const meta = {
  title: 'Molecules/InfoCard',
  component: Card,
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const StatCard: Story = {
  render: () => ({
    components: { Card, CardHeader, CardTitle, CardDescription, CardContent, Trophy },
    template: `
      <Card class="max-w-xs">
        <CardHeader>
          <CardTitle class="flex items-center gap-2"><Trophy class="size-5 text-amber-500" /> Trophées</CardTitle>
          <CardDescription>Saison en cours</CardDescription>
        </CardHeader>
        <CardContent>
          <p class="text-3xl font-black">7 842</p>
          <p class="text-sm text-muted-foreground">Record : 8 015</p>
        </CardContent>
      </Card>`,
  }),
}

export const WithActions: Story = {
  render: () => ({
    components: { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button },
    template: `
      <Card class="max-w-sm">
        <CardHeader>
          <CardTitle>Lier votre compte</CardTitle>
          <CardDescription>Retrouvez vos stats en un clic à chaque connexion.</CardDescription>
        </CardHeader>
        <CardContent class="text-sm">Il vous suffit de votre tag Clash Royale.</CardContent>
        <CardFooter class="justify-end gap-2">
          <Button variant="ghost">Plus tard</Button>
          <Button>Lier mon compte</Button>
        </CardFooter>
      </Card>`,
  }),
}

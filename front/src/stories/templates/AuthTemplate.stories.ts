import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

/**
 * Gabarit des pages d'authentification (connexion, inscription).
 * Atomic Design : un template place les organismes et molécules dans une mise en page,
 * avec du contenu factice. Les pages réelles (Pages/Login, Pages/Register) le remplissent.
 */
const meta = {
  title: 'Templates/AuthTemplate',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => ({
    components: {
      Button,
      Card,
      CardHeader,
      CardTitle,
      CardDescription,
      CardContent,
      Field,
      FieldLabel,
      Input,
    },
    template: `
      <div class="min-h-screen w-full flex items-center justify-center bg-slate-50 p-4">
        <Card class="w-full max-w-md">
          <CardHeader class="items-center text-center">
            <div class="mx-auto mb-2 size-16 rounded-2xl bg-slate-200" aria-hidden="true"></div>
            <CardTitle>[Titre de la page]</CardTitle>
            <CardDescription>[Sous-titre explicatif]</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <Field>
              <FieldLabel for="field-1">[Champ 1]</FieldLabel>
              <Input id="field-1" placeholder="…" />
            </Field>
            <Field>
              <FieldLabel for="field-2">[Champ 2]</FieldLabel>
              <Input id="field-2" placeholder="…" />
            </Field>
            <Button class="w-full">[Action principale]</Button>
            <p class="text-center text-sm text-muted-foreground">[Lien secondaire]</p>
          </CardContent>
        </Card>
      </div>`,
  }),
}

export const Gerard800x600: Story = {
  ...Default,
  globals: { viewport: { value: 'gerardUsable', isRotated: false } },
}

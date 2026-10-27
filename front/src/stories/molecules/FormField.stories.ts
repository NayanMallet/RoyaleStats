import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

/**
 * Champ de formulaire complet : libellé + saisie + aide + message d'erreur.
 * C'est la brique des formulaires de connexion, d'inscription et de liaison de compte.
 */
const meta = {
  title: 'Molecules/FormField',
  component: Field,
  args: { orientation: 'vertical' },
  argTypes: {
    orientation: { control: 'inline-radio', options: ['vertical', 'horizontal', 'responsive'] },
  },
} satisfies Meta<typeof Field>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => ({
    components: { Field, FieldLabel, FieldDescription, Input },
    setup: () => ({ args }),
    template: `
      <Field v-bind="args" class="max-w-sm">
        <FieldLabel for="email">Adresse e-mail</FieldLabel>
        <Input id="email" type="email" placeholder="vous@exemple.com" />
        <FieldDescription>Utilisée uniquement pour la connexion.</FieldDescription>
      </Field>`,
  }),
}

/** État d'erreur : le message est lisible sans dépendre de la couleur (persona Gérard). */
export const WithError: Story = {
  render: (args) => ({
    components: { Field, FieldLabel, FieldError, Input },
    setup: () => ({ args }),
    template: `
      <Field v-bind="args" data-invalid="true" class="max-w-sm">
        <FieldLabel for="tag">Tag du joueur</FieldLabel>
        <Input id="tag" model-value="#???" aria-invalid="true" aria-describedby="tag-error" />
        <FieldError id="tag-error" :errors="['Joueur introuvable dans Clash Royale']" />
      </Field>`,
  }),
}

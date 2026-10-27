import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { action } from 'storybook/actions'
import { Search } from 'lucide-vue-next'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'

/** Barre de recherche d'un joueur ou d'un clan par son tag : icône + saisie + bouton. */
const meta = {
  title: 'Molecules/SearchBar',
  component: InputGroup,
} satisfies Meta<typeof InputGroup>

export default meta
type Story = StoryObj<typeof meta>

const renderSearchBar = (initialValue: string) => () => ({
  components: { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, Search },
  setup: () => ({ query: ref(initialValue), onSearch: action('search') }),
  template: `
    <form class="max-w-md" @submit.prevent="onSearch(query)">
      <InputGroup>
        <InputGroupAddon><Search /></InputGroupAddon>
        <InputGroupInput v-model="query" placeholder="#TAG du joueur" aria-label="Tag du joueur" />
        <InputGroupAddon align="inline-end">
          <InputGroupButton type="submit" variant="default">Rechercher</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>`,
})

export const Empty: Story = { render: renderSearchBar('') }

export const Filled: Story = { render: renderSearchBar('#2PP8VJ9Q') }

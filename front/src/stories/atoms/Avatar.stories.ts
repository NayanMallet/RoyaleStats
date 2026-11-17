import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import profilePicture from '@/assets/pp.jpg'

/** Avatar de l'utilisateur connecté. Les initiales s'affichent si l'image ne charge pas. */
const meta = {
  title: 'Atoms/Avatar',
  component: Avatar,
} satisfies Meta<typeof Avatar>

export default meta
type Story = StoryObj<typeof meta>

export const WithImage: Story = {
  render: () => ({
    components: { Avatar, AvatarImage, AvatarFallback },
    setup: () => ({ profilePicture }),
    template: `
      <Avatar class="size-12">
        <AvatarImage :src="profilePicture" alt="Karim Benali" />
        <AvatarFallback>KB</AvatarFallback>
      </Avatar>`,
  }),
}

export const Fallback: Story = {
  render: () => ({
    components: { Avatar, AvatarImage, AvatarFallback },
    template: `
      <Avatar class="size-12">
        <AvatarImage src="/does-not-exist.png" alt="Karim Benali" />
        <AvatarFallback>KB</AvatarFallback>
      </Avatar>`,
  }),
}

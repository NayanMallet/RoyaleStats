<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { LogOut, User, Settings } from 'lucide-vue-next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import profilePicture from '@/assets/pp.jpg'

const authStore = useAuthStore()
const router = useRouter()

const userInitials = computed(() => {
  const user = authStore.user
  if (!user || !user.name) return 'U'
  const names = user.name.split(' ').filter(n => n.length > 0)
  if (names.length >= 2) {
    const first = names[0] as string
    const second = names[1] as string
    return (first.charAt(0) + second.charAt(0)).toUpperCase()
  }
  return user.name.substring(0, 2).toUpperCase()
})

const handleLogout = () => {
  authStore.logout()
  router.push('/')
}

const goToProfile = () => {
  router.push('/profile')
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        class="relative h-12 w-12 rounded-full hover:ring-2 hover:ring-blue-500/20 transition-all"
      >
        <Avatar class="h-12 w-12 border-2 border-white shadow-lg">
          <AvatarImage :src="profilePicture" alt="Profile" />
          <AvatarFallback
            class="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-sm"
          >
            {{ userInitials }}
          </AvatarFallback>
        </Avatar>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      class="w-56 rounded-2xl shadow-2xl border-white/50 bg-white/95 backdrop-blur-xl"
      align="end"
    >
      <DropdownMenuLabel class="font-bold text-slate-700">
        <div class="flex flex-col space-y-1">
          <p class="text-sm font-bold">{{ authStore.user?.name || 'User' }}</p>
          <p class="text-xs font-normal text-slate-500">{{ authStore.user?.email || '' }}</p>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator class="bg-slate-100" />
      <DropdownMenuItem
        @click="goToProfile"
        class="cursor-pointer hover:bg-blue-50 rounded-xl mx-1 my-0.5 focus:bg-blue-50"
      >
        <User class="mr-2 h-4 w-4 text-blue-600" />
        <span class="font-medium">Mon profil</span>
      </DropdownMenuItem>
      <DropdownMenuSeparator class="bg-slate-100" />
      <DropdownMenuItem
        @click="handleLogout"
        class="cursor-pointer hover:bg-red-50 rounded-xl mx-1 my-0.5 focus:bg-red-50 text-red-600"
      >
        <LogOut class="mr-2 h-4 w-4" />
        <span class="font-medium">Déconnexion</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

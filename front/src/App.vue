<script setup lang="ts">
import { ref, onMounted } from 'vue'
import 'vue-sonner/style.css'
import { toast } from 'vue-sonner'

import type { User } from '@/types/user'

import { fetchUsers, createUser } from '@/services/users.service'

import UserForm from '@/components/forms/UserForm.vue'
import UsersList from '@/components/users/UsersList.vue'
import { Toaster } from '@/components/ui/sonner'

const users = ref<User[]>([])

const loadingUsers = ref(false)

const creatingUser = ref(false)

async function loadUsers() {
  try {
    loadingUsers.value = true
    users.value = await fetchUsers()
  } catch (err) {
    console.error(err)
    toast.error('Unable to load users')
  } finally {
    loadingUsers.value = false
  }
}

async function handleCreateUser(payload: { player_tag: string; password: string }) {
  try {
    creatingUser.value = true
    await createUser(payload)
    await loadUsers()
    toast.success('User created')
  } catch (err: any) {
    console.error(err)
    const msg = err?.message || 'Error while creating user'
    toast.error(msg)
  } finally {
    creatingUser.value = false
  }
}

onMounted(() => {
    loadUsers()
})
</script>

<template>
  <main class="min-h-screen bg-muted/40 text-foreground">
    <Toaster />

    <div class="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10">
      <header class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
            RoyaleStats User Management
          </h1>
          <p class="text-sm text-muted-foreground sm:text-base">
            Register users with their Clash Royale player tags to link accounts.
          </p>
        </div>
      </header>

      <div class="mx-auto max-w-2xl space-y-4">
        <UserForm @submit="handleCreateUser" :submitting="creatingUser" />
        <UsersList
          :users="users"
          :loading="loadingUsers"
          @refresh="loadUsers"
        />
      </div>
    </div>
  </main>
</template>

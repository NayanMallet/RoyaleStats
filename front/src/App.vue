<script setup lang="ts">
import { ref, onMounted } from 'vue'
import 'vue-sonner/style.css'
import { toast } from 'vue-sonner'

import type { Item } from '@/types/item'
import type { User } from '@/types/user'

import { fetchUsers, createUser } from '@/services/users.service'
import { fetchItems, createItem } from '@/services/items.service'

import UserForm from '@/components/forms/UserForm.vue'
import ItemForm from '@/components/forms/ItemForm.vue'
import UsersList from '@/components/users/UsersList.vue'
import ItemsList from '@/components/items/ItemsList.vue'
import { Toaster } from '@/components/ui/sonner'

const users = ref<User[]>([])
const items = ref<Item[]>([])

const loadingUsers = ref(false)
const loadingItems = ref(false)

const creatingUser = ref(false)
const creatingItem = ref(false)

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

async function loadItems() {
  try {
    loadingItems.value = true
    items.value = await fetchItems()
  } catch (err) {
    console.error(err)
    toast.error('Unable to load items')
  } finally {
    loadingItems.value = false
  }
}

async function handleCreateUser(payload: { name: string; email: string; password: string }) {
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

async function handleCreateItem(payload: { name: string }) {
  try {
    creatingItem.value = true
    await createItem(payload)
    await loadItems()
    toast.success('Item created')
  } catch (err: any) {
    console.error(err)
    const msg = err?.message || 'Error while creating item'
    toast.error(msg)
  } finally {
    creatingItem.value = false
  }
}

onMounted(() => {
  loadUsers()
  loadItems()
})
</script>

<template>
  <main class="min-h-screen bg-muted/40 text-foreground">
    <Toaster />

    <div class="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10">
      <header class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
            Microservices Playground
          </h1>
          <p class="text-sm text-muted-foreground sm:text-base">
            Create users and items through your Node microservices and inspect what is returned by
            the API gateway.
          </p>
        </div>
      </header>

      <div class="grid gap-6 lg:grid-cols-2">
        <div class="space-y-4">
          <UserForm @submit="handleCreateUser" :submitting="creatingUser" />
          <UsersList :users="users" :loading="loadingUsers" @refresh="loadUsers" />
        </div>

        <div class="space-y-4">
          <ItemForm @submit="handleCreateItem" :submitting="creatingItem" />
          <ItemsList :items="items" :loading="loadingItems" @refresh="loadItems" />
        </div>
      </div>
    </div>
  </main>
</template>

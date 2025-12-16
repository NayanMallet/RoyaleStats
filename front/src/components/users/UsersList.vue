<script setup lang="ts">
import type { User } from '@/types/user'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  users: User[]
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'refresh'): void
}>()
</script>

<template>
  <Card class="h-max">
    <CardHeader class="flex flex-row items-center justify-between">
      <div>
        <CardTitle class="text-base"> Users </CardTitle>
        <CardDescription>
          Data fetched from <code class="font-mono text-xs">/api/users</code>.
        </CardDescription>
      </div>
      <Button size="sm" variant="outline" :disabled="props.loading" @click="emit('refresh')">
        {{ props.loading ? 'Refreshing…' : 'Refresh' }}
      </Button>
    </CardHeader>
    <CardContent>
      <div v-if="props.loading" class="text-sm text-muted-foreground">Loading users…</div>

      <ul v-else-if="props.users.length" class="divide-y divide-border">
        <li
          v-for="user in props.users"
          :key="user.uuid"
          class="flex items-center justify-between py-3"
        >
          <div>
            <p class="text-sm font-medium leading-none">
              {{ user.player_tag }}
            </p>
            <p class="mt-1 text-xs text-muted-foreground">
              Created {{ new Date(user.created_at).toLocaleDateString() }}
            </p>
          </div>
          <span class="font-mono text-xs text-muted-foreground"> {{ user.uuid.slice(0, 8) }}… </span>
        </li>
      </ul>

      <p v-else class="text-sm text-muted-foreground">
        No users yet. Use the form above to create one.
      </p>
    </CardContent>
  </Card>
</template>

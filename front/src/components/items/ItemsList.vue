<script setup lang="ts">
import type { Item } from '@/types/item'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  items: Item[]
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
        <CardTitle class="text-base"> Items </CardTitle>
        <CardDescription>
          Data fetched from <code class="font-mono text-xs">/api/items</code>.
        </CardDescription>
      </div>
      <Button size="sm" variant="outline" :disabled="props.loading" @click="emit('refresh')">
        {{ props.loading ? 'Refreshing…' : 'Refresh' }}
      </Button>
    </CardHeader>
    <CardContent>
      <div v-if="props.loading" class="text-sm text-muted-foreground">Loading items…</div>

      <ul v-else-if="props.items.length" class="divide-y divide-border">
        <li
          v-for="item in props.items"
          :key="item.id"
          class="flex items-center justify-between py-3"
        >
          <div>
            <p class="text-sm font-medium leading-none">
              {{ item.name }}
            </p>
          </div>
          <span class="text-xs text-muted-foreground"> #{{ item.id }} </span>
        </li>
      </ul>

      <p v-else class="text-sm text-muted-foreground">
        No items yet. Use the form above to create one.
      </p>
    </CardContent>
  </Card>
</template>

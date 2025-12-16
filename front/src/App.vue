<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner'
</script>

<template>
    <main class="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-900">
        <Toaster />
        <RouterView />
    </main>
</template>

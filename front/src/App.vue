<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner'
import PlayerStats from '@/components/PlayerStats.vue'
</script>

<template>
    <main class="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-900">
        <Toaster />

        <div class="mx-auto flex flex-col gap-8 px-4 py-10 w-full relative overflow-hidden">
             <!-- Background decoration -->
            <div class="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-50 to-transparent -z-10" />

            <header class="flex flex-col items-center justify-center gap-2 mb-4 relative z-10">
                <h1 class="text-5xl font-black tracking-tighter text-slate-900 drop-shadow-sm">
                    ROYALE STATS
                </h1>
                <p class="text-sm font-medium text-slate-400 tracking-widest uppercase">
                    Analytics Professionnels
                </p>
            </header>

            <PlayerStats />
            
            <footer class="mt-12 text-center text-xs text-slate-300">
                Clash Royale est une marque de Supercell. Ce site n'est pas affilié à Supercell.
            </footer>
        </div>
    </main>
</template>

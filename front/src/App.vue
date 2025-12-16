<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner'
import PlayerStats from '@/components/PlayerStats.vue'
import AppLogo from '@/statics/Logo.png'
</script>

<template>
    <main class="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-900">
        <Toaster />

        <div class="mx-auto flex flex-col gap-8 px-4 py-10 w-full relative overflow-hidden">
             <!-- Background decoration -->
            <div class="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-50 to-transparent -z-10" />

            <header class="flex flex-col items-center justify-center gap-4 mb-8 relative z-10 animate-in fade-in slide-in-from-top-4 duration-700">
                <img 
                    :src="AppLogo" 
                    alt="Royale Stats Logo" 
                    class="h-24 md:h-32 w-auto object-contain drop-shadow-xl hover:scale-105 hover:drop-shadow-2xl transition-all duration-300 cursor-pointer"
                />
            </header>

            <PlayerStats />
            
            <footer class="mt-12 text-center text-xs text-slate-300">
                Clash Royale est une marque de Supercell. Ce site n'est pas affilié à Supercell.
            </footer>
        </div>
    </main>
</template>

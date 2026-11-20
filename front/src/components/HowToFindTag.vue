<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  type: 'player' | 'clan'
}>()

const steps = computed(() => {
  if (props.type === 'player') {
    return [
      {
        id: 1,
        title: 'Ouvrez votre profil',
        description: 'Tapez sur votre pseudo dans le menu principal du jeu.',
        image: new URL('@/assets/tuto_name_Id_1.jpeg', import.meta.url).href,
        alt: 'Capture du menu principal de Clash Royale : le pseudo du joueur, à toucher pour ouvrir le profil',
        bg: 'bg-info-soft',
        border: 'border-info-border',
        imageClass: 'w-full h-full object-cover object-left',
      },
      {
        id: 2,
        title: 'Repérez le Tag',
        description: 'Le code commençant par # sous votre pseudo est votre identifiant unique.',
        image: new URL('@/assets/tuto_name_Id_2.jpeg', import.meta.url).href,
        alt: 'Capture du profil du joueur : le tag commençant par # sous le pseudo',
        bg: 'bg-ranked-soft',
        border: 'border-ranked-border',
        imageClass: 'w-full h-full object-cover',
      },
      {
        id: 3,
        title: 'Copiez-le',
        description: 'Appuyez sur le Tag pour le copier, puis collez-le ici.',
        image: new URL('@/assets/tuto_name_Id_3.jpeg', import.meta.url).href,
        alt: 'Capture du profil du joueur : le tag copié après l’avoir touché',
        bg: 'bg-success-soft',
        border: 'border-success-border',
        imageClass: 'w-full h-full object-cover object-right',
      },
    ]
  } else {
    return [
      {
        id: 1,
        title: 'Info du Clan',
        description: 'Ouvrez la page de votre clan via le chat ou votre profil.',
        image: new URL('@/assets/tuto_clan_Id_1.jpeg', import.meta.url).href,
        alt: 'Capture de Clash Royale : accès à la page du clan',
        bg: 'bg-clan-soft',
        border: 'border-clan-border',
        imageClass: 'w-full h-full object-cover object-left',
      },
      {
        id: 2,
        title: 'Tag du Clan',
        description: 'Le code # se trouve juste en dessous du nom du clan.',
        image: new URL('@/assets/tuto_clan_Id_2.jpeg', import.meta.url).href,
        alt: 'Capture de la page du clan : le tag commençant par # sous le nom du clan',
        bg: 'bg-warning-soft',
        border: 'border-warning-border',
        imageClass: 'w-full h-full object-cover object-bottom',
      },
      {
        id: 3,
        title: 'Copiez & Cherchez',
        description: 'Notez ce code et entrez-le dans la barre de recherche ci-dessus.',
        image: new URL('@/assets/tuto_clan_id_3.jpeg', import.meta.url).href,
        alt: 'Capture de la page du clan : le tag du clan à copier',
        bg: 'bg-success-soft',
        border: 'border-success-border',
        imageClass: 'w-full h-full object-cover',
      },
    ]
  }
})
</script>

<template>
  <div
    class="w-full max-w-7xl mx-auto px-4 py-2 animate-in fade-in slide-in-from-bottom-8 duration-700"
  >
    <div
      class="bg-card/80 backdrop-blur-xl rounded-[2.5rem] shadow-xl border border-card/50 p-8 md:p-12"
    >
      <div class="text-center mb-10 space-y-2">
        <h3 class="text-2xl font-black text-foreground tracking-tight">
          Comment trouver votre identifiant ?
        </h3>
        <p class="text-muted-foreground font-medium">
          Suivez ces 3 étapes simples pour trouver le Tag
          {{ type === 'player' ? 'Joueur' : 'Clan' }}
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div
          v-for="step in steps"
          :key="step.id"
          class="group relative bg-card rounded-3xl p-4 pb-6 border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden"
          :class="[step.border, 'hover:' + step.border]"
        >
          <!-- Decorative background glow -->
          <div
            class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            :class="step.bg"
          ></div>

          <div class="relative z-10 flex flex-col items-center text-center space-y-6">
            <!-- Image Container -->
            <div
              class="w-full aspect-video bg-muted rounded-2xl border border-border flex items-center justify-center overflow-hidden relative shadow-inner group-hover:shadow-md transition-all"
            >
              <img :src="step.image" :alt="step.alt" :class="step.imageClass" />

              <!-- Step Number Badge -->
              <div
                class="absolute top-2 left-2 w-8 h-8 rounded-full bg-card shadow-sm flex items-center justify-center font-black text-sm text-muted-foreground border border-border"
              >
                <span class="sr-only">Étape</span> {{ step.id }}
              </div>
            </div>

            <!-- Content -->
            <div class="px-2">
              <h4 class="text-lg font-black text-foreground mb-2">{{ step.title }}</h4>
              <p class="text-sm text-muted-foreground font-medium leading-relaxed">
                {{ step.description }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

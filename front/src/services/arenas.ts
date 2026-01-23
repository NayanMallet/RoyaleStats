import arenaData from './arenas.json'

export interface ArenaDetails {
  id: number
  name: string // French name
  image: string
}

// French Translations
const ARENA_NAMES: Record<number | string, string> = {
  0: "Camp d'Entraînement",
  1: 'Gobelinarium',
  2: 'Fosse aux Os',
  3: 'Arène des Barbares',
  4: 'Parc P.E.K.K.Aland',
  5: 'Vallée des Sorts',
  6: "Atelier d'Ouvriers",
  7: 'Arène Royale',
  8: 'Sommet Glacé',
  9: 'Arène Sauvage',
  10: 'Mont des Cochons',
  11: 'Vallée Électrique',
  12: 'Ville Sinistre',
  13: 'Planque des Coquins',
  14: 'Pic Serein',
  15: 'Mine de Mineur',
  16: 'Cuisine du Bourreau',
  17: 'Crypte Royale',
  18: 'Sanctuaire Silencieux',
  19: 'Termes des Dragons',
  20: 'Arène des Légendes',
  21: 'Arène des Challengers I',
  22: 'Arène des Challengers II',
  23: 'Arène des Maîtres I',
  24: 'Arène des Maîtres II',
  25: 'Chalet des Amoureux',
  26: 'Voie Royale',
  27: 'Rue des Mousquetaires',
  28: 'Sommet des Héros',
  // Common API fallbacks if IDs mismatch
  'Royal Road': 'Voie Royale',
  'Trophy Road': 'Voie des Trophées',
}

const CDN_BASE_URL = 'https://cdn.jsdelivr.net/gh/RoyaleAPI/cr-api-assets@master/arenas/'

// Load local arena images (arena15+)
// Keys will be like '../arenas/arena15.png'
const localArenas = import.meta.glob('../assets/*.{png,webp}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

export function getArenaDetails(id: number | string, apiName?: string): ArenaDetails {
  // console.log('[getArenaDetails] Input:', { id, apiName });

  // 1. Resolve Name (French)
  let numericId = typeof id === 'number' ? id : parseInt(id as string, 10)

  // Prioritize Name lookup because API IDs for Leagues can be confusing/reused (e.g. 54000016 for Dragon Spa)
  let arenaInfo

  if (apiName) {
    arenaInfo = arenaData.find((a: any) => a.name === apiName || a.slug === apiName)
  }

  // Fallback to ID lookup if name didn't match
  if (!arenaInfo) {
    arenaInfo = arenaData.find((a: any) => a.id === numericId || a.number === numericId)
  }

  // If we have a huge ID, we might find it in JSON, get the 'number' (e.g. 15), and use that for translation map?
  let lookupId = numericId
  if (arenaInfo) {
    lookupId = arenaInfo.number
  }

  let frenchName = ARENA_NAMES[lookupId]

  if (!frenchName && apiName) {
    frenchName = ARENA_NAMES[apiName] || undefined
  }

  if (!frenchName) {
    frenchName = apiName || `Arène ${lookupId}`
  }

  // 2. Resolve Image (Hybrid Strategy)
  let image = 'https://placehold.co/400x200/png?text=Arena' // Default

  if (arenaInfo && arenaInfo.image) {
    const arenaNum = arenaInfo.number

    if (arenaNum <= 14) {
      // Use CDN
      image = `${CDN_BASE_URL}${arenaInfo.image}`
    } else {
      // Use Local
      // Construct key: ../assets/arena15.png
      const localKey = `../assets/${arenaInfo.image}`
      const localPath = localArenas[localKey]

      if (localPath) {
        image = localPath
      } else {
        console.warn(`[Arenas] Local image not found for key: ${localKey}`)
        // Fallback to CDN just in case user added it there? Or placeholder.
        image = `${CDN_BASE_URL}${arenaInfo.image}`
      }
    }
  } else if (apiName === 'Trophy Road') {
    // Fallback for Trophy Road specifically if not in JSON
    const fallback = arenaData.find((a: any) => a.number === 1)
    if (fallback) image = `${CDN_BASE_URL}${fallback.image}`
  }

  return {
    id: numericId || 0,
    name: frenchName,
    image,
  }
}

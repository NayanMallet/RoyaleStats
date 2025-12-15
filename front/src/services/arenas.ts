export interface ArenaDetails {
    id: number;
    name: string; // French name
    image: string;
}

// Mapped from standard lists. 
// Note: Images sourced from community assets (RoyaleAPI/GitHub).
const ARENA_NAMES: Record<number | string, string> = {
    0: "Camp d'Entraînement",
    1: "Gobelinarium",
    2: "Fosse aux Os",
    3: "Arène des Barbares",
    4: "Parc P.E.K.K.Aland",
    5: "Vallée des Sorts",
    6: "Atelier d'Ouvriers",
    7: "Arène Royale",
    8: "Sommet Glacé",
    9: "Arène Sauvage",
    10: "Mont des Cochons",
    11: "Vallée Électrique",
    12: "Ville Sinistre",
    13: "Planque des Coquins",
    14: "Pic Serein",
    15: "Mine de Mineur",
    16: "Cuisine du Bourreau",
    17: "Crypte Royale",
    18: "Sanctuaire Silencieux",
    19: "Termes des Dragons",
    20: "Arène des Légendes",
    21: "Arène des Challengers I",
    22: "Arène des Challengers II",
    23: "Arène des Maîtres I",
    24: "Arène des Maîtres II",
    25: "Arène des Champions",
    26: "Grand Festin Gobelin",
    // Common API fallbacks if IDs mismatch
    "Royal Road": "Voie Royale",
    "Trophy Road": "Voie des Trophées"
};

// Fallback for new arenas
export function getArenaDetails(id: number | string, apiName?: string): ArenaDetails {
    console.log('[getArenaDetails] Input:', { id, apiName });

    // Special Case: "Royal Road" or "Arena_L" series often implies specific high-level arenas
    // We map "Royal Road" to "Voie Royale" explicitly.
    if (apiName === "Royal Road") {
        return {
            id: 0, // ID ignored by UI now
            name: "Voie Royale",
            // Fallback to a nice arena image since 54000130 doesn't have one
            image: "https://raw.githubusercontent.com/RoyaleAPI/cr-api-assets/master/arenas-png/arena-1.png"
        };
    }

    let numericId = typeof id === 'number' ? id : parseInt(id as string);

    // Try to map by ID first
    let frenchName = ARENA_NAMES[numericId];

    // Fallback: Check if we mapped the English name directly
    if (!frenchName && apiName) {
        frenchName = ARENA_NAMES[apiName] || undefined;
    }

    // Fallback: Use API name or generic "Arène X"
    if (!frenchName) {
        frenchName = apiName || `Arène ${numericId || id}`;
    }

    console.log('[getArenaDetails] Name Resolved:', frenchName);

    // Image URL construction
    // Use fallback for high IDs (like 54000130) or missing assets.
    // Standard arenas are usually 0-26ish.
    let image: string;

    if (numericId > 30 || isNaN(numericId)) {
        // Fallback for weird IDs/Leagues -> Arena 1 (Goblinarium) or Legendary Arena (13/20)?
        // Let's use Arena 1 (Goblinarium) as it's colorful and neutral enough, or Arena 11 (Electro).
        // User seemed OK with the image I set previously (placeholder/arena-1 fallback).
        image = "https://raw.githubusercontent.com/RoyaleAPI/cr-api-assets/master/arenas-png/arena-1.png";
    } else {
        image = `https://raw.githubusercontent.com/RoyaleAPI/cr-api-assets/master/arenas-png/arena-${numericId}.png`;
    }

    return {
        id: numericId || 0,
        name: frenchName,
        image
    };
}

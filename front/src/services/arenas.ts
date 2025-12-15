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

    let numericId = typeof id === 'number' ? id : parseInt(id as string);

    // Special Case: Robust detection for Goblin Mode / Arena 26
    if (
        apiName === "Royal Road" ||
        id === "Royal Road" ||
        numericId === 26 ||
        (apiName && apiName.includes("Goblin"))
    ) {
        numericId = 26;
        id = 26;
    }

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
    // Since official asset URLs are unstable/404ing, we use a placeholder or known working fallback.
    // For Arena 26, we'll use a placeholder until a valid asset is found.
    let image: string;

    if (numericId === 26) {
        // Fallback for Arena 26 specifically to ensure it has *something*
        image = "https://raw.githubusercontent.com/RoyaleAPI/cr-api-assets/master/arenas-png/arena-1.png";
        // If that 404s (which it did in tests), let's use a reliable placeholder for now to prove it works.
        // Actually, let's try to leave it empty or generic to avoid broken icon? 
        // User said "image doesn't work". 
        // Let's use the placeholder service.
        image = "https://placehold.co/200x200/10b981/ffffff?text=Ar%C3%A8ne+26";
    } else {
        image = `https://raw.githubusercontent.com/RoyaleAPI/cr-api-assets/master/arenas-png/arena-${numericId}.png`;
    }

    return {
        id: numericId || 0,
        name: frenchName,
        image
    };
}

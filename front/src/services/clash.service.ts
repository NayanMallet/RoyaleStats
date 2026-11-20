import { apiEndpoints } from '@/config/api'
import { ApiError, http } from './http'

export interface PlayerProfile {
  tag: string
  name: string
  expLevel: number
  trophies: number
  bestTrophies: number
  wins: number
  losses: number
  battleCount: number
  threeCrownWins: number
  challengeCardsWon: number
  tournamentCardsWon: number
  role: string
  clan?: {
    tag: string
    name: string
    badgeId: number
  }
  arena?: {
    id: number
    name: string
  }
  leagueStatistics?: {
    currentSeason?: {
      trophies: number
      bestTrophies: number
    }
    previousSeason?: {
      id: string
      trophies: number
      bestTrophies: number
    }
    bestSeason?: {
      id: string
      trophies: number
      bestTrophies: number
    }
  }
  badges?: {
    name: string
    level: number
    maxLevel: number
    progress: number
    target?: number
    iconUrls: {
      large: string
    }
  }[]
  achievements?: {
    name: string
    stars: number
    value: number
    target: number
    info: string
  }[]
  cards?: Card[]
  supportCards?: Card[]
  currentDeck: Card[]
  currentPathOfLegendSeasonResult?: {
    leagueNumber: number
    trophies: number
    rank: number | null
  }
  lastPathOfLegendSeasonResult?: {
    leagueNumber: number
    trophies: number
    rank: number | null
  }
  bestPathOfLegendSeasonResult?: {
    leagueNumber: number
    trophies: number
    rank: number | null
  }
  progress?: {
    [key: string]: {
      arena?: {
        name: string
        id: number
      }
      trophies?: number
      bestTrophies?: number
    }
  }
  totalExpPoints?: number
  starPoints?: number
  totalDonations?: number // Added to fix TS error
}

export interface Card {
  name: string
  id: number
  level: number
  maxLevel: number
  rarity: string
  count: number
  elixirCost: number
  iconUrls: {
    medium: string
    heroMedium?: string
    evolutionMedium?: string
  }
  evolutionLevel?: number // Added to fix type error
}

// -- Clan Types --
export interface ClanMember {
  tag: string
  name: string
  role: string
  lastSeen: string
  expLevel: number
  trophies: number
  arena: { id: number; name: string }
  clanRank: number
  previousClanRank: number
  donations: number
  donationsReceived: number
}

export interface ClanDetails {
  tag: string
  name: string
  type: string
  description: string
  badgeId: number
  clanScore: number
  clanWarTrophies: number
  location: { id: number; name: string; isCountry: boolean; countryCode: string }
  requiredTrophies: number
  donationsPerWeek: number
  members: number
  memberList: ClanMember[]
}

export async function fetchClan(tag: string): Promise<ClanDetails> {
  try {
    return await http.getPublic<ClanDetails>(apiEndpoints.clash.clan(tag))
  } catch (error) {
    throw withMessage(error, 404, 'Clan introuvable : vérifiez le tag.')
  }
}

export function getClanBadgeUrl(badgeId: number): string {
  // RoyaleAPI assets often use badges_75 directory or just badges
  // If standard fails, try badges_75 or similar.
  // For now, attempting the most common pattern.
  // If badgeId is 0 or undefined, return a generic shield.
  if (!badgeId)
    return 'https://raw.githubusercontent.com/RoyaleAPI/cr-api-assets/master/badges/0.png'
  return `https://raw.githubusercontent.com/RoyaleAPI/cr-api-assets/master/badges/${badgeId}.png`
}

export async function fetchCards(): Promise<Card[]> {
  const data = await http.getPublic<{ items?: Card[] }>(apiEndpoints.clash.cards)
  return data.items ?? []
}

export async function fetchPlayer(tag: string): Promise<PlayerProfile> {
  try {
    return await http.getPublic<PlayerProfile>(apiEndpoints.clash.player(tag))
  } catch (error) {
    throw withMessage(error, 404, 'Joueur introuvable : vérifiez le tag.')
  }
}

/** Replaces the message of an ApiError of the given status, keeping its code and requestId. */
function withMessage(error: unknown, status: number, message: string): unknown {
  if (!(error instanceof ApiError) || error.status !== status) return error
  return new ApiError(status, message, { code: error.code, requestId: error.requestId })
}

/** Fake data shared by the stories. Shapes mirror the real API responses (see services/*). */
import type { User } from '@/services/auth.service'
import type { Card, ClanDetails, ClanMember, PlayerProfile } from '@/services/clash.service'
import type { PlayerLink } from '@/services/link.service'
import type { MetaSnapshot } from '@/services/meta.service'

export const demoUser: User = {
  id: 1,
  name: 'Karim Benali',
  email: 'karim@example.com',
  created_at: '2025-09-01T10:00:00.000Z',
}

export const demoLink: PlayerLink = {
  id: 1,
  user_id: demoUser.id,
  player_tag: '#2PP8VJ9Q',
  twitter: 'karim_cr',
  twitch: 'karimcr',
  linked_at: '2025-10-12T18:30:00.000Z',
}

export const demoLinkWithoutSocials: PlayerLink = {
  ...demoLink,
  twitter: undefined,
  twitch: undefined,
}

export const demoMetaSnapshot: MetaSnapshot = {
  totalBattles: 1284,
  generatedAt: '2026-10-27T08:00:00.000Z',
  topCards: [
    { card_name: 'Hog Rider', usage_count: 412, win_count: 228, win_rate: 55.3 },
    { card_name: 'The Log', usage_count: 398, win_count: 207, win_rate: 52 },
    { card_name: 'Musketeer', usage_count: 301, win_count: 150, win_rate: 49.8 },
    { card_name: 'Fireball', usage_count: 287, win_count: 149, win_rate: 51.9 },
    { card_name: 'Ice Spirit', usage_count: 254, win_count: 119, win_rate: 46.9 },
    { card_name: 'Valkyrie', usage_count: 233, win_count: 124, win_rate: 53.2 },
  ],
}

export const emptyMetaSnapshot: MetaSnapshot = {
  totalBattles: 0,
  generatedAt: '2026-10-27T08:00:00.000Z',
  topCards: [],
}

/** Raw Path of Legend rankings, as returned by GET /api/clash/locations/global/pathoflegend/players. */
export const demoPathOfLegendRankings = {
  items: [
    { tag: '#9LYC2R0C', name: 'Mohamed Light', rank: 1, eloRating: 3412 },
    { tag: '#2PP8VJ9Q', name: 'Karim Benali', rank: 2, eloRating: 3388 },
    { tag: '#80RGVCJ2', name: 'Sacha', rank: 3, eloRating: 3351 },
    { tag: '#LQ9QP0Y8', name: 'Gérard', rank: 4, eloRating: 3297 },
    { tag: '#Y2RJ8U0L', name: 'Morten', rank: 5, eloRating: 3260 },
  ],
}

/** Raw RoyaleAPI level 16 rankings, as returned by GET /api/royaleapi/players/level/16?json=1. */
export const demoTrophyRankings = {
  data: [
    { rank: 1, name: 'Surgical Goblin', tag: '#P0LYJC8C', trophies: 12_850 },
    { rank: 2, name: 'Mugi', tag: '#Q8CVR2UR', trophies: 12_731 },
    { rank: 3, name: 'Ryley', tag: '#J0L8UQ9C', trophies: 12_604 },
  ],
}

/** Season leaderboards, as returned by GET /api/clash/leaderboards. */
export const demoSeasonLeaderboards = {
  items: [
    { id: 170000005, name: 'Merge Tactics' },
    { id: 170000006, name: '2v2 League' },
  ],
}

// ---------------------------------------------------------------------------------------------
// Player profile (PlayerStats, HomeView)
// ---------------------------------------------------------------------------------------------

const RARITY_COLORS: Record<string, string> = {
  common: '#3b82f6',
  rare: '#f97316',
  epic: '#a855f7',
  legendary: '#14b8a6',
  champion: '#eab308',
}

/**
 * Offline stand-in for a RoyaleAPI image: an SVG data URI, so that stories never load a
 * picture from the network. The label is shortened to fit the tile.
 */
export function placeholderImage(label: string, color = '#64748b'): string {
  const text = label
    .split(/[\s.]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0))
    .join('')
    .slice(0, 3)
    .toUpperCase()
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 75 90">` +
    `<rect x="2" y="2" width="71" height="86" rx="10" fill="${color}" stroke="#0f172a" stroke-width="3"/>` +
    `<text x="37.5" y="54" font-family="sans-serif" font-size="24" font-weight="700" ` +
    `fill="#fff" text-anchor="middle">${text}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

interface CardSeed {
  name: string
  id: number
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'champion'
  elixirCost: number
  maxLevel: number
}

/** Card definitions, as returned by GET /api/clash/cards (`{ items }`). */
const cardSeeds: CardSeed[] = [
  { name: 'Hog Rider', id: 26000021, rarity: 'rare', elixirCost: 4, maxLevel: 14 },
  { name: 'Musketeer', id: 26000014, rarity: 'rare', elixirCost: 4, maxLevel: 14 },
  { name: 'Ice Golem', id: 26000038, rarity: 'rare', elixirCost: 2, maxLevel: 14 },
  { name: 'Cannon', id: 27000000, rarity: 'common', elixirCost: 3, maxLevel: 16 },
  { name: 'Fireball', id: 28000000, rarity: 'rare', elixirCost: 4, maxLevel: 14 },
  { name: 'The Log', id: 28000011, rarity: 'legendary', elixirCost: 2, maxLevel: 8 },
  { name: 'Ice Spirit', id: 26000030, rarity: 'common', elixirCost: 1, maxLevel: 16 },
  { name: 'Skeletons', id: 26000010, rarity: 'common', elixirCost: 1, maxLevel: 16 },
  { name: 'Valkyrie', id: 26000011, rarity: 'rare', elixirCost: 4, maxLevel: 14 },
  { name: 'Archer Queen', id: 26000072, rarity: 'champion', elixirCost: 5, maxLevel: 6 },
]

const cardIcons = (seed: CardSeed) => ({
  medium: placeholderImage(seed.name, RARITY_COLORS[seed.rarity]),
})

export const demoCardDefinitions = {
  items: cardSeeds.map((seed) => ({ ...seed, iconUrls: cardIcons(seed) })),
}

/** Same rarity, one level below max: the component adds the rarity offset to show "Lvl 15". */
function deckCard(name: string, extra: Partial<Card> = {}): Card {
  const seed = cardSeeds.find((candidate) => candidate.name === name)
  if (!seed) throw new Error(`Unknown card in fixtures: ${name}`)
  return {
    ...seed,
    level: seed.maxLevel - 1,
    count: 120,
    iconUrls: cardIcons(seed),
    ...extra,
  }
}

const badgeNames = [
  'Classic12Wins',
  'Grand12Wins',
  'YearsPlayed',
  'ClanWarsVeteran',
  'LadderTop1000',
  'Crl20Wins2025',
  'EmoteCollection',
  'BannerCollection',
  'ClanDonations',
  'BattleWins',
  'MasteryHogRider',
  'MasteryMusketeer',
  'MasteryIceGolem',
  'MasteryCannon',
  'MasteryFireball',
  'MasteryTheLog',
  'MasteryIceSpirit',
  'MasterySkeletons',
  'MasteryValkyrie',
  'MasteryArcherQueen',
]

/** Player profile, as returned by GET /api/clash/players/:tag (only the fields the front reads). */
export const demoPlayerProfile: PlayerProfile = {
  tag: demoLink.player_tag,
  name: 'KarimDuClan',
  expLevel: 62,
  trophies: 6284,
  bestTrophies: 6512,
  wins: 8431,
  losses: 6120,
  battleCount: 16872,
  threeCrownWins: 3105,
  challengeCardsWon: 21450,
  tournamentCardsWon: 862,
  role: 'coLeader',
  totalDonations: 98412,
  clan: { tag: '#9QJ2Y0RV', name: 'Les Gobelins', badgeId: 16000052 },
  arena: { id: 54000017, name: 'Royal Crypt' },
  currentPathOfLegendSeasonResult: { leagueNumber: 10, trophies: 3388, rank: 2 },
  lastPathOfLegendSeasonResult: { leagueNumber: 10, trophies: 3120, rank: 154 },
  bestPathOfLegendSeasonResult: { leagueNumber: 10, trophies: 3412, rank: 1 },
  progress: {
    AutoChess_2026_Nov: {
      arena: { id: 160000006, name: 'Goblin Arena 6' },
      trophies: 1840,
      bestTrophies: 2010,
    },
  },
  badges: badgeNames.map((name, index) => ({
    name,
    level: (index % 8) + 1,
    maxLevel: 8,
    progress: 100,
    iconUrls: { large: placeholderImage(name.replace(/([A-Z])/g, ' $1'), '#ca8a04') },
  })),
  currentDeck: [
    deckCard('Hog Rider'),
    deckCard('Musketeer'),
    deckCard('Ice Golem'),
    deckCard('Cannon', { evolutionLevel: 1 }),
    deckCard('Fireball'),
    deckCard('The Log'),
    deckCard('Ice Spirit'),
    deckCard('Skeletons', { evolutionLevel: 1 }),
  ],
}

/**
 * A solo player: no clan, no Path of Legend, no badges, Merge Tactics not started.
 * The arena is one whose picture ships with the front (src/assets), so nothing is downloaded.
 */
export const demoSoloPlayerProfile: PlayerProfile = {
  tag: '#LQ9QP0Y8',
  name: 'Gérard',
  expLevel: 41,
  trophies: 5210,
  bestTrophies: 5384,
  wins: 2412,
  losses: 2187,
  battleCount: 4705,
  threeCrownWins: 648,
  challengeCardsWon: 1120,
  tournamentCardsWon: 0,
  role: '',
  totalDonations: 0,
  arena: { id: 54000057, name: 'Valkalla' },
  currentDeck: [
    deckCard('Valkyrie', { level: 10 }),
    deckCard('Musketeer', { level: 10 }),
    deckCard('Hog Rider', { level: 10 }),
    deckCard('Cannon', { level: 12 }),
    deckCard('Fireball', { level: 10 }),
    deckCard('Ice Spirit', { level: 12 }),
    deckCard('Skeletons', { level: 12 }),
    deckCard('Ice Golem', { level: 10 }),
  ],
}

function clanMember(
  tag: string,
  name: string,
  role: string,
  trophies: number,
  donations: number,
  donationsReceived: number,
): Omit<ClanMember, 'clanRank' | 'previousClanRank'> {
  return {
    tag,
    name,
    role,
    trophies,
    donations,
    donationsReceived,
    lastSeen: '20261118T201500.000Z',
    expLevel: 55,
    arena: { id: 54000017, name: 'Royal Crypt' },
  }
}

/** Clan details, as returned by GET /api/clash/clans/:tag. */
export const demoClan: ClanDetails = {
  tag: '#9QJ2Y0RV',
  name: 'Les Gobelins',
  type: 'inviteOnly',
  description: 'Clan FR actif. Guerre de clans obligatoire, 200 dons par semaine minimum.',
  badgeId: 16000052,
  clanScore: 68420,
  clanWarTrophies: 3210,
  location: { id: 57000087, name: 'France', isCountry: true, countryCode: 'FR' },
  requiredTrophies: 5000,
  donationsPerWeek: 4820,
  members: 5,
  memberList: [
    clanMember('#80RGVCJ2', 'Sacha', 'leader', 7012, 402, 380),
    clanMember(demoLink.player_tag, 'KarimDuClan', 'coLeader', 6284, 512, 240),
    clanMember('#Y2RJ8U0L', 'Morten', 'elder', 5980, 288, 310),
    clanMember('#P0LYJC8C', 'Lina', 'member', 5521, 140, 96),
    clanMember('#Q8CVR2UR', 'Tom', 'member', 5103, 64, 120),
  ].map((member, index) => ({ ...member, clanRank: index + 1, previousClanRank: index + 1 })),
}

/** Last battles, as returned by GET /api/clash/players/:tag/battles (sent back to the meta-service). */
export const demoPlayerBattles = [
  {
    type: 'pathOfLegend',
    battleTime: '20261118T203012.000Z',
    team: [
      {
        tag: demoLink.player_tag,
        name: 'KarimDuClan',
        crowns: 3,
        cards: demoPlayerProfile.currentDeck.map(({ name, id, level }) => ({ name, id, level })),
      },
    ],
    opponent: [
      {
        tag: '#9LYC2R0C',
        name: 'Mohamed Light',
        crowns: 1,
        cards: demoSoloPlayerProfile.currentDeck.map(({ name, id, level }) => ({
          name,
          id,
          level,
        })),
      },
    ],
  },
  {
    type: 'PvP',
    battleTime: '20261118T201544.000Z',
    team: [
      {
        tag: demoLink.player_tag,
        name: 'KarimDuClan',
        crowns: 0,
        cards: demoPlayerProfile.currentDeck.map(({ name, id, level }) => ({ name, id, level })),
      },
    ],
    opponent: [
      {
        tag: '#Y2RJ8U0L',
        name: 'Morten',
        crowns: 2,
        cards: demoSoloPlayerProfile.currentDeck.map(({ name, id, level }) => ({
          name,
          id,
          level,
        })),
      },
    ],
  },
]

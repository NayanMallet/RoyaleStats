/** Fake data shared by the stories. Shapes mirror the real API responses (see services/*). */
import type { User } from '@/services/auth.service'
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

/**
 * Path of Legend rankings with long names, long clan names and large scores:
 * stress test for the leaderboard columns (no horizontal scroll at any width).
 */
export const longPathOfLegendRankings = {
  items: [
    {
      tag: '#9LYC2R0C',
      name: 'Mohamed Light le Magnifique',
      rank: 1,
      eloRating: 123_456,
      clan: { tag: '#QCQ0PL', name: 'Les Chevaliers de la Tour Royale', badgeId: 16_000_000 },
    },
    {
      tag: '#2PP8VJ9Q',
      name: 'KarimBenaliDuQuartierNord',
      rank: 2,
      eloRating: 98_765,
      clan: { tag: '#8YLQ2C', name: 'Clan des Gobelins Électriques', badgeId: 16_000_001 },
    },
    { tag: '#80RGVCJ2', name: 'Sacha', rank: 3, eloRating: 3351 },
  ],
}

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

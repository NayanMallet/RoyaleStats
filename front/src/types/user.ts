export interface User {
  uuid: string
  player_tag: string
  password?: string  // Optional for display purposes
  created_at: string
  updated_at: string
}

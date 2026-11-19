// Common types shared across all microservices

export interface User {
  id: number;
  name: string;
  email: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserCreatePayload {
  name: string;
  email: string;
  password: string;
}

export interface UserLoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: Omit<User, 'password'>;
}

export interface Item {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
}

export interface ItemCreatePayload {
  name: string;
  description?: string;
}

export interface PlayerLink {
  id: number;
  user_id: number;
  player_tag: string;
  twitter?: string;
  twitch?: string;
  linked_at: string;
}

export interface PlayerLinkUpdatePayload {
  twitter?: string;
  twitch?: string;
}

export interface PlayerLinkCreatePayload {
  userId: number;
  playerTag: string;
}

/** Error contract returned by every service (docs/ERROR-HANDLING.md). */
export interface ApiError {
  /** Stable machine-readable code, in PascalCase: ValidationError, PlayerNotFound… */
  error: string;
  /** Message the user can read. Generic for a 5xx in production. */
  message: string;
  statusCode: number;
  /** Same value as the x-request-id header and the server logs. */
  requestId: string;
  /** Development, or the invalid fields of a 400. */
  details?: unknown;
  /** Development only. */
  stack?: string;
}

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  service?: string;
  timestamp?: string;
}

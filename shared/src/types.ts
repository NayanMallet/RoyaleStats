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
  linked_at: string;
}

export interface PlayerLinkCreatePayload {
  userId: number;
  playerTag: string;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  service?: string;
  timestamp?: string;
}

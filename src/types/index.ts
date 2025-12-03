// Common types for the application

export interface User {
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  verified?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  tokens: AuthTokens;
  user: User;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

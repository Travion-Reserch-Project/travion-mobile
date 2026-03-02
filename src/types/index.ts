// Common types for the application

export interface User {
  preferences: { history: number; adventure: number; nature: number; relaxation: number; };
  userId: string;
  name: string;
  userName?: string;
  email: string;
  avatar?: string;
  verified?: boolean;
  profileStatus?: 'Incomplete' | 'Complete';
  hasSetPreferences?: boolean; // Flag to check if travel preferences are set
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
  status?: number;
  code?: string;
  headers?: Headers;
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// Travel Preference Scores (0-1 scale)
export interface TravelPreferenceScores {
  history: number;     // Interest in historical/cultural sites
  adventure: number;   // Interest in adventure activities
  nature: number;      // Interest in nature/wildlife
  relaxation: number;  // Interest in relaxation/spiritual experiences
}

// Export service types
export * from './services';

// Export chat types
export * from './chat';

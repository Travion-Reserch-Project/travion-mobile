export const APP_NAME = 'Travion';
export const APP_VERSION = '1.0.0';

// API Configuration
export const API_CONFIG = {
  BASE_URL: __DEV__ ? 'http://localhost:3001' : 'https://api.travion.com',
  TIMEOUT: 30000,
} as const;

// Screen names for navigation
export const SCREENS = {
  HOME: 'Home',
  PROFILE: 'Profile',
  SETTINGS: 'Settings',
} as const;

// Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@travion:auth_token',
  USER_DATA: '@travion:user_data',
  THEME_PREFERENCE: '@travion:theme_preference',
} as const;

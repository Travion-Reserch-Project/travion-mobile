import { Platform } from 'react-native';

export const APP_NAME = 'Travion';
export const APP_VERSION = '1.0.0';

// API Configuration
const ANDROID_EMULATOR_HOST = '10.0.2.2';

export const API_CONFIG = {
  BASE_URL: __DEV__
    ? Platform.OS === 'android'
      ? // Android emulator must call host machine through 10.0.2.2
        `http://${ANDROID_EMULATOR_HOST}:3001`
      : 'http://localhost:3001'
    : 'https://api.travion.online',
  API_VERSION: '/api/v1',
  TIMEOUT: 60000,
  USE_COOKIES: true,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
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
  REFRESH_TOKEN: '@travion:refresh_token',
  USER_DATA: '@travion:user_data',
  THEME_PREFERENCE: '@travion:theme_preference',
} as const;

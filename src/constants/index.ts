import { Platform } from 'react-native';
import Config from 'react-native-config';

export const APP_NAME = 'Travion';
export const APP_VERSION = '1.0.0';

const DEFAULT_BASE_URL = 'https://traviongo.online';
const API_VERSION = '/api/v1';

function normalizeBaseUrl(baseUrl: string): string {
  const trimmedBaseUrl = baseUrl.replace(/\/+$/, '');
  return trimmedBaseUrl.endsWith(API_VERSION)
    ? trimmedBaseUrl.slice(0, -API_VERSION.length)
    : trimmedBaseUrl;
}

function resolveBaseUrl(): string {
  const configuredBaseUrl = normalizeBaseUrl(Config.API_BASE_URL || DEFAULT_BASE_URL);

  if (__DEV__ && Platform.OS === 'android') {
    return configuredBaseUrl
      .replace('://localhost', '://10.0.2.2')
      .replace('://127.0.0.1', '://10.0.2.2');
  }

  return configuredBaseUrl;
}

// API Configuration
export const API_CONFIG = {
  BASE_URL: resolveBaseUrl(),
  API_VERSION,
  TIMEOUT: Number(Config.API_TIMEOUT) || 60000,
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
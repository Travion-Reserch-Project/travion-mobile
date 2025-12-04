import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import type { AuthTokens, User } from '@types';

class AuthUtils {
  private static readonly TOKEN_KEY = 'auth_tokens';
  private static readonly USER_KEY = 'user_profile';
  private static readonly REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry

  // Check if user is currently authenticated
  static async isAuthenticated(): Promise<boolean> {
    try {
      const tokens = await this.getStoredTokens();
      if (!tokens) return false;

      const now = Date.now();
      const expiryTime = tokens.expiresIn;

      return now < expiryTime;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }

  // Check if token needs refresh (within 5 minutes of expiry)
  static async needsTokenRefresh(): Promise<boolean> {
    try {
      const tokens = await this.getStoredTokens();
      if (!tokens) return false;

      const now = Date.now();
      const refreshTime = tokens.expiresIn - this.REFRESH_THRESHOLD;

      return now >= refreshTime;
    } catch (error) {
      console.error('Error checking token refresh:', error);
      return false;
    }
  }

  // Store authentication tokens securely
  static async storeTokens(tokens: AuthTokens): Promise<void> {
    try {
      if (!tokens) {
        throw new Error('Tokens are undefined or null');
      }

      if (!tokens.accessToken) {
        throw new Error('Access token is missing from tokens object');
      }

      console.log('Storing tokens:', {
        hasAccessToken: !!tokens.accessToken,
        hasRefreshToken: !!tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      });

      await AsyncStorage.setItem(this.TOKEN_KEY, JSON.stringify(tokens));
    } catch (error) {
      console.error('Error storing tokens:', error);
      throw new Error('Failed to store authentication tokens');
    }
  }

  // Retrieve stored authentication tokens
  static async getStoredTokens(): Promise<AuthTokens | null> {
    try {
      const tokens = await AsyncStorage.getItem(this.TOKEN_KEY);
      return tokens ? JSON.parse(tokens) : null;
    } catch (error) {
      console.error('Error getting tokens:', error);
      return null;
    }
  }

  // Store user profile data
  static async storeUser(user: User): Promise<void> {
    try {
      if (!user) {
        console.error('Attempted to store undefined/null user');
        throw new Error('User data is required');
      }

      if (!user.userId || !user.email) {
        console.error('Invalid user data - missing required fields:', user);
        throw new Error('User data is incomplete');
      }

      await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error storing user:', error);
      throw new Error('Failed to store user profile');
    }
  }

  // Retrieve stored user profile data
  static async getStoredUser(): Promise<User | null> {
    try {
      const user = await AsyncStorage.getItem(this.USER_KEY);
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  // Clear all authentication data (logout)
  static async clearAuthData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([this.TOKEN_KEY, this.USER_KEY]);

      try {
        await GoogleSignin.signOut();
      } catch {}
    } catch (error) {
      console.error('Error clearing auth data:', error);
      throw new Error('Failed to clear authentication data');
    }
  }

  // Get current auth state (authenticated user and tokens)
  static async getAuthState(): Promise<{
    user: User | null;
    tokens: AuthTokens | null;
    isAuthenticated: boolean;
  }> {
    try {
      const [user, tokens, isAuthenticated] = await Promise.all([
        this.getStoredUser(),
        this.getStoredTokens(),
        this.isAuthenticated(),
      ]);

      return { user, tokens, isAuthenticated };
    } catch (error) {
      console.error('Error getting auth state:', error);
      return { user: null, tokens: null, isAuthenticated: false };
    }
  }

  // Extract and parse tokens from cookie string (for WebView OAuth)
  static extractTokensFromCookies(cookies: string): AuthTokens | null {
    try {
      const cookieArray = cookies.split(';').map(cookie => cookie.trim());
      let accessToken = '';
      let refreshToken = '';
      let expiresIn = 0;

      cookieArray.forEach(cookie => {
        const [name, value] = cookie.split('=');

        if (name === 'access_token') {
          accessToken = decodeURIComponent(value);
        } else if (name === 'refresh_token') {
          refreshToken = decodeURIComponent(value);
        } else if (name === 'expires_in') {
          expiresIn = parseInt(decodeURIComponent(value), 10);
        }
      });

      if (accessToken && refreshToken) {
        return {
          accessToken,
          refreshToken,
          expiresIn: expiresIn || Date.now() + 24 * 60 * 60 * 1000, // Default 24h if not provided
        };
      }

      return null;
    } catch (error) {
      console.error('Error extracting tokens from cookies:', error);
      return null;
    }
  }

  // Validate token structure
  static validateTokens(tokens: any): tokens is AuthTokens {
    return (
      tokens &&
      typeof tokens.accessToken === 'string' &&
      typeof tokens.refreshToken === 'string' &&
      typeof tokens.expiresIn === 'number'
    );
  }
}

export { AuthUtils };

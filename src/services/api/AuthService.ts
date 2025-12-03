import { apiClient } from './client';
import { AuthUtils } from '@utils/auth';
import type { AuthTokens, User, AuthResponse, LoginRequest, RegisterRequest } from '@types';

class AuthService {
  async login(email: string, password: string): Promise<AuthResponse> {
    const loginData: LoginRequest = { email, password };
    const response = await apiClient.post<AuthResponse>('/auth/login', loginData);

    if (!response.success) {
      throw new Error(response.error || 'Login failed');
    }

    const authData = response.data!;
    await AuthUtils.storeTokens(authData.tokens);
    await AuthUtils.storeUser(authData.user);

    return authData;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', userData);

    if (!response.success) {
      throw new Error(response.error || 'Registration failed');
    }

    const authData = response.data!;
    await AuthUtils.storeTokens(authData.tokens);
    await AuthUtils.storeUser(authData.user);

    return authData;
  }

  /**
   * Login/register with Google OAuth
   */
  async loginWithGoogle(googleAuthData: {
    tokens: { accessToken: string; refreshToken: string; expiresIn: number };
    user: { userId: string; email: string; name: string; picture: string; verified: boolean };
  }): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/google', {
        idToken: googleAuthData.tokens.accessToken,
        user: googleAuthData.user,
      });

      if (!response.success) {
        throw new Error(response.error || 'Google authentication failed');
      }

      console.log('Full response object:', response);
      console.log('Response.data:', response.data);

      // The response might be nested - check both possibilities
      const authData = response.data;

      console.log('Backend Google auth response - authData:', authData);
      console.log('authData structure:', {
        hasAuthData: !!authData,
        authDataKeys: authData ? Object.keys(authData) : [],
        hasTokens: !!authData?.tokens,
        tokensKeys: authData?.tokens ? Object.keys(authData.tokens) : [],
        accessToken: authData?.tokens?.accessToken ? 'present' : 'missing',
        hasUser: !!authData?.user,
      });

      // Validate that we have the required data before storing
      if (!authData?.tokens || !authData.tokens.accessToken) {
        console.error('Token validation failed:', {
          hasTokens: !!authData?.tokens,
          hasAccessToken: !!authData?.tokens?.accessToken,
          tokensObject: authData?.tokens,
        });
        throw new Error('Invalid response: missing tokens from backend');
      }

      if (!authData.user) {
        throw new Error('Invalid response: missing user data from backend');
      }

      await AuthUtils.storeTokens(authData.tokens);
      await AuthUtils.storeUser(authData.user);

      return authData;
    } catch (error) {
      console.error('Google login API call failed:', error);

      // If backend call fails, fall back to using the Google data directly
      // This allows the app to work even if backend is down
      console.log('Falling back to local Google auth data storage');

      const fallbackAuthData: AuthResponse = {
        tokens: googleAuthData.tokens,
        user: googleAuthData.user,
      };

      await AuthUtils.storeTokens(fallbackAuthData.tokens);
      await AuthUtils.storeUser(fallbackAuthData.user);

      return fallbackAuthData;
    }
  }

  async getProfile(): Promise<User> {
    const tokens = await AuthUtils.getStoredTokens();
    if (!tokens) {
      throw new Error('No tokens available');
    }

    const response = await apiClient.get<{ user: User }>('/auth/profile', {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to get profile');
    }

    const user = response.data!.user;
    await AuthUtils.storeUser(user);
    return user;
  }

  /**
   * Get OAuth URL for server-side authentication
   */
  getOAuthUrl(): string {
    return 'http://localhost:3001/api/v1/auth/google';
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(): Promise<AuthTokens> {
    const tokens = await AuthUtils.getStoredTokens();
    if (!tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiClient.post<{ tokens: AuthTokens }>('/auth/refresh', {
      refreshToken: tokens.refreshToken,
    });

    if (!response.success) {
      throw new Error(response.error || 'Token refresh failed');
    }

    const newTokens = response.data!.tokens;
    await AuthUtils.storeTokens(newTokens);
    return newTokens;
  }

  /**
   * Logout from backend and clear local data
   */
  async logout(): Promise<void> {
    const tokens = await AuthUtils.getStoredTokens();

    // Call backend logout endpoint if we have tokens
    if (tokens) {
      try {
        await apiClient.post(
          '/auth/logout',
          {},
          {
            headers: {
              Authorization: `Bearer ${tokens.accessToken}`,
            },
          },
        );
      } catch (error) {
        console.warn('Backend logout failed:', error);
        // Continue with local logout even if backend fails
      }
    }

    // Clear local auth data
    await AuthUtils.clearAuthData();
  }
}

export const authService = new AuthService();

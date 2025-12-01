import { apiClient } from './client';
import { AuthUtils } from '@utils/auth';
import type { AuthTokens, User, AuthResponse, LoginRequest, RegisterRequest } from '@types';

class AuthService {
  async login(email: string, password: string): Promise<AuthResponse> {
    const loginData: LoginRequest = { email, password };
    const response = await apiClient.post<AuthResponse>('/api/v1/auth/login', loginData);

    if (!response.success) {
      throw new Error(response.error || 'Login failed');
    }

    const authData = response.data!;
    await AuthUtils.storeTokens(authData.tokens);
    await AuthUtils.storeUser(authData.user);

    return authData;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/api/v1/auth/register', userData);

    if (!response.success) {
      throw new Error(response.error || 'Registration failed');
    }

    const authData = response.data!;
    await AuthUtils.storeTokens(authData.tokens);
    await AuthUtils.storeUser(authData.user);

    return authData;
  }

  async getProfile(): Promise<User> {
    const tokens = await AuthUtils.getStoredTokens();
    if (!tokens) {
      throw new Error('No tokens available');
    }

    const response = await apiClient.get<{ user: User }>('/api/v1/auth/profile', {
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

    const response = await apiClient.post<{ tokens: AuthTokens }>('/api/v1/auth/refresh', {
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
          '/api/v1/auth/logout',
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

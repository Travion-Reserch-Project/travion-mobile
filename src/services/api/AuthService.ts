import { BaseApiService } from './BaseApiService';
import { AuthUtils } from '@utils/auth';
import { apiClient } from './client';
import type { AuthTokens, AuthResponse, LoginRequest, RegisterRequest } from '@types';

class AuthService extends BaseApiService {
  constructor() {
    super('/auth');
  }

  //Login with email/password
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const loginData: LoginRequest = { email, password };
      const response = await this.unauthenticatedPost<AuthResponse>('/login', loginData);
      const authData = this.handleApiResponse(response);

      await AuthUtils.storeTokens(authData.tokens);
      const normalizedUser = {
        ...authData.user,
        userId: authData.user.userId || (authData.user as any)._id,
      };
      await AuthUtils.storeUser(normalizedUser);

      return { ...authData, user: normalizedUser };
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  // Register new user
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await this.unauthenticatedPost<AuthResponse>('/register', userData);
      const authData = this.handleApiResponse(response);

      await AuthUtils.storeTokens(authData.tokens);
      const normalizedUser = {
        ...authData.user,
        userId: authData.user.userId || (authData.user as any)._id,
      };
      await AuthUtils.storeUser(normalizedUser);

      return { ...authData, user: normalizedUser };
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  //Google OAuth login with fallback mechanism
  async loginWithGoogle(googleAuthData: {
    tokens: { accessToken: string; refreshToken: string; expiresIn: number };
    user: { userId: string; email: string; name: string; picture: string; verified: boolean };
  }): Promise<AuthResponse> {
    try {
      const requestPayload = {
        idToken: googleAuthData.tokens.accessToken,
        user: googleAuthData.user,
      };

      const response = await this.unauthenticatedPost<AuthResponse>('/google', requestPayload);

      const authData = this.handleApiResponse(response);

      await AuthUtils.storeTokens(authData.tokens);
      const normalizedUser = {
        ...authData.user,
        userId: authData.user.userId || (authData.user as any)._id,
        profileStatus: authData.user.profileStatus || ('Incomplete' as const), // Default to Incomplete if not provided
      };
      await AuthUtils.storeUser(normalizedUser);

      return { ...authData, user: normalizedUser };
    } catch (error) {
      console.warn('Backend Google auth failed, using fallback:', error);

      const normalizedUser = {
        ...googleAuthData.user,
        userId: googleAuthData.user.userId || (googleAuthData.user as any)._id,
        profileStatus: 'Incomplete' as const, // Default to Incomplete for new Google users
      };

      await AuthUtils.clearAuthData();
      await AuthUtils.storeUser(normalizedUser);

      return {
        tokens: { accessToken: '', refreshToken: '', expiresIn: 0 },
        user: normalizedUser,
      };
    }
  }

  //Refresh auth tokens
  async refreshToken(): Promise<AuthTokens> {
    try {
      const tokens = await AuthUtils.getStoredTokens();
      if (!tokens?.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiClient.post<{ tokens: AuthTokens }>('/refresh', {
        refreshToken: tokens.refreshToken,
      });

      const data = this.handleApiResponse(response);
      await AuthUtils.storeTokens(data.tokens);
      return data.tokens;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await AuthUtils.clearAuthData();
      throw error;
    }
  }

  //Logout with backend cleanup
  async logout(): Promise<void> {
    const tokens = await AuthUtils.getStoredTokens();

    if (tokens) {
      try {
        await apiClient.post(
          '/logout',
          {},
          {
            headers: { Authorization: `Bearer ${tokens.accessToken}` },
          },
        );
      } catch (error) {
        console.warn('Backend logout failed, continuing with local cleanup:', error);
      }
    }
    await AuthUtils.clearAuthData();
  }
}

export const authService = new AuthService();

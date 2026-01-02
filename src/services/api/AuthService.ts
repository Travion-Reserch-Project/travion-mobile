import { BaseApiService } from './BaseApiService';
import { AuthUtils } from '@utils/auth';
import { apiClient } from './client';
import type { AuthTokens, AuthResponse, LoginRequest, RegisterRequest } from '@types';

// Backend response structure (different from AuthResponse)
interface BackendAuthResponse {
  user: {
    userId?: string;
    _id?: string;
    name: string;
    email: string;
    avatar?: string;
    verified?: boolean;
    profileStatus?: 'Incomplete' | 'Complete';
  };
  token: string;        // Backend uses 'token' not 'accessToken'
  refreshToken: string;
  expiresIn?: number;   // May not be provided by backend
}

class AuthService extends BaseApiService {
  constructor() {
    super('/auth');
  }

  /**
   * Convert backend response to standard AuthResponse format
   */
  private normalizeAuthResponse(backendData: BackendAuthResponse): AuthResponse {
    // Default expiry to 7 days (in seconds) if not provided
    // Note: The auth store will convert this to a timestamp
    const defaultExpirySeconds = 7 * 24 * 60 * 60; // 7 days in seconds
    const expiresIn = backendData.expiresIn || defaultExpirySeconds;

    const tokens: AuthTokens = {
      accessToken: backendData.token,
      refreshToken: backendData.refreshToken,
      expiresIn, // In seconds - auth store will convert to timestamp
    };

    const user = {
      ...backendData.user,
      userId: backendData.user.userId || backendData.user._id || '',
    };

    return { tokens, user };
  }

  //Login with email/password
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const loginData: LoginRequest = { email, password };
      const response = await this.unauthenticatedPost<BackendAuthResponse>('/login', loginData);
      const backendData = this.handleApiResponse(response);

      console.log('Login response from backend:', {
        hasToken: !!backendData.token,
        hasRefreshToken: !!backendData.refreshToken,
        hasUser: !!backendData.user,
      });

      // Normalize the response to match expected AuthResponse format
      const authData = this.normalizeAuthResponse(backendData);

      // Store tokens
      await AuthUtils.storeTokens(authData.tokens);
      await AuthUtils.storeUser(authData.user);

      return authData;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  // Register new user
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await this.unauthenticatedPost<BackendAuthResponse>('/register', userData);
      const backendData = this.handleApiResponse(response);

      console.log('Register response from backend:', {
        hasToken: !!backendData.token,
        hasRefreshToken: !!backendData.refreshToken,
        hasUser: !!backendData.user,
      });

      // Normalize the response
      const authData = this.normalizeAuthResponse(backendData);

      // Store tokens
      await AuthUtils.storeTokens(authData.tokens);
      await AuthUtils.storeUser(authData.user);

      return authData;
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

      const response = await this.unauthenticatedPost<BackendAuthResponse>('/google', requestPayload);
      const backendData = this.handleApiResponse(response);

      console.log('Google login response from backend:', {
        hasToken: !!backendData.token,
        hasRefreshToken: !!backendData.refreshToken,
        hasUser: !!backendData.user,
      });

      // Normalize the response
      const authData = this.normalizeAuthResponse(backendData);

      // Ensure profileStatus is set
      authData.user.profileStatus = authData.user.profileStatus || 'Incomplete';

      // Store tokens
      await AuthUtils.storeTokens(authData.tokens);
      await AuthUtils.storeUser(authData.user);

      return authData;
    } catch (error) {
      console.warn('Backend Google auth failed, using fallback:', error);

      const normalizedUser = {
        ...googleAuthData.user,
        userId: googleAuthData.user.userId || (googleAuthData.user as any)._id,
        profileStatus: 'Incomplete' as const,
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

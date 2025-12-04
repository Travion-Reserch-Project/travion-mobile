import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, userService } from '../services/api';
import { AuthUtils } from '@utils/auth';
import type { AuthTokens, User } from '@types';

interface AuthState {
  // State
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;

  // Computed
  isAuthenticated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (authData: any) => Promise<void>;
  register: (userData: { email: string; password: string; name: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  updateUser: (user: User) => Promise<void>;

  // Internal actions
  setUser: (user: User | null) => void;
  setTokens: (tokens: AuthTokens | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      tokens: null,
      isLoading: false,

      // Computed getter
      get isAuthenticated() {
        const { tokens } = get();
        if (!tokens) return false;

        const now = Date.now();
        return now < tokens.expiresIn;
      },

      // Actions
      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true });

          const authData = await authService.login(email, password);

          set({
            tokens: authData.tokens,
            user: authData.user,
          });
        } catch (error) {
          console.error('Login error:', error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      loginWithGoogle: async (authData: any) => {
        try {
          set({ isLoading: true });

          // Call backend API to authenticate with Google
          const response = await authService.loginWithGoogle(authData);

          // Store the tokens and user data returned from backend
          set({
            tokens: response.tokens,
            user: response.user,
          });

          // Only log success if we have valid tokens
          if (response.tokens) {
            console.log('Google login successful, user stored in database');
          } else {
            console.log('Google login successful (offline mode), user stored locally');
          }
        } catch (error) {
          console.error('Google login error:', error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (userData: { email: string; password: string; name: string }) => {
        try {
          set({ isLoading: true });

          const authData = await authService.register(userData);

          set({
            tokens: authData.tokens,
            user: authData.user,
          });
        } catch (error) {
          console.error('Registration error:', error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try {
          set({ isLoading: true });

          await authService.logout();

          set({
            tokens: null,
            user: null,
          });
        } catch (error) {
          console.error('Logout error:', error);
          // Even if backend logout fails, clear local state
          set({
            tokens: null,
            user: null,
          });
        } finally {
          set({ isLoading: false });
        }
      },

      refreshProfile: async () => {
        try {
          const { tokens } = get();
          if (!tokens) return;

          const userProfile = await userService.getProfile();
          set({ user: userProfile });
        } catch (error) {
          console.error('Refresh profile error:', error);
          // If refresh fails, might need to re-authenticate
          get().logout();
          throw error;
        }
      },

      initializeAuth: async () => {
        try {
          set({ isLoading: true });

          const authState = await AuthUtils.getAuthState();

          if (authState.isAuthenticated && authState.user && authState.tokens) {
            set({
              tokens: authState.tokens,
              user: authState.user,
            });
          } else {
            // Clear any stale data
            set({
              tokens: null,
              user: null,
            });
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          set({
            tokens: null,
            user: null,
          });
        } finally {
          set({ isLoading: false });
        }
      },

      updateUser: async (user: User) => {
        try {
          await AuthUtils.storeUser(user);
          set({ user });
        } catch (error) {
          console.error('Update user error:', error);
          throw error;
        }
      },

      // Internal setters for direct state updates
      setUser: (user: User | null) => set({ user }),
      setTokens: (tokens: AuthTokens | null) => set({ tokens }),
      setLoading: (isLoading: boolean) => set({ isLoading }),
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist essential data
      partialize: state => ({
        user: state.user,
        tokens: state.tokens,
      }),
    },
  ),
);

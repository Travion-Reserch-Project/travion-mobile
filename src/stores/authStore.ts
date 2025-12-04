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
  hasSeenOnboarding: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (authData: any) => Promise<void>;
  register: (userData: { email: string; password: string; name: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  completeOnboarding: () => void;
  resetOnboarding: () => void; // For testing purposes
  clearAllData: () => Promise<void>; // Clear all persisted data

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
      hasSeenOnboarding: false,
      isAuthenticated: false,

      // Actions
      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true });

          const authData = await authService.login(email, password);

          // Convert expiresIn from seconds to timestamp
          const tokensWithTimestamp = authData.tokens
            ? {
                ...authData.tokens,
                expiresIn: Date.now() + authData.tokens.expiresIn * 1000,
              }
            : null;

          set({
            tokens: tokensWithTimestamp,
            user: authData.user,
            isAuthenticated: !!(tokensWithTimestamp && authData.user),
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
          // Convert expiresIn from seconds to timestamp
          const tokensWithTimestamp = response.tokens
            ? {
                ...response.tokens,
                expiresIn: Date.now() + response.tokens.expiresIn * 1000, // Convert seconds to milliseconds and add to now
              }
            : null;

          set({
            tokens: tokensWithTimestamp,
            user: response.user,
            isAuthenticated: !!(tokensWithTimestamp && response.user),
          });

          // Debug: Check the state immediately after setting
          const currentState = get();
          console.log('State after Google login set:', {
            isAuthenticated: currentState.isAuthenticated,
            hasUser: !!currentState.user,
            hasTokens: !!currentState.tokens,
          });

          // Debug log the stored values
          console.log('Google login - tokens stored:', {
            hasTokens: !!tokensWithTimestamp,
            hasUser: !!response.user,
            userProfileStatus: response.user?.profileStatus || 'NOT_SET',
            originalExpiresIn: response.tokens?.expiresIn,
            convertedExpiresIn: tokensWithTimestamp?.expiresIn,
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

          // Convert expiresIn from seconds to timestamp
          const tokensWithTimestamp = authData.tokens
            ? {
                ...authData.tokens,
                expiresIn: Date.now() + authData.tokens.expiresIn * 1000,
              }
            : null;

          set({
            tokens: tokensWithTimestamp,
            user: authData.user,
            isAuthenticated: !!(tokensWithTimestamp && authData.user),
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
            isAuthenticated: false,
          });
        } catch (error) {
          console.error('Logout error:', error);
          // Even if backend logout fails, clear local state
          set({
            tokens: null,
            user: null,
            isAuthenticated: false,
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

          // After hydration, ensure isAuthenticated state is correct
          const currentState = get();
          const { user, tokens, hasSeenOnboarding } = currentState;
          const shouldBeAuthenticated = !!(user && tokens);

          set({ isAuthenticated: shouldBeAuthenticated });

          console.log('Auth initialized', {
            hasUser: !!user,
            hasTokens: !!tokens,
            hasSeenOnboarding,
            isAuthenticated: shouldBeAuthenticated,
            userProfileStatus: user?.profileStatus,
            storedState: 'hydrated from AsyncStorage',
          });
        } catch (error) {
          console.error('Auth initialization error:', error);
          set({
            tokens: null,
            user: null,
            isAuthenticated: false,
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

      completeOnboarding: () => {
        set({ hasSeenOnboarding: true });
      },

      resetOnboarding: () => {
        set({ hasSeenOnboarding: false });
      },

      clearAllData: async () => {
        try {
          // Clear AsyncStorage
          await AsyncStorage.removeItem('auth-store');

          // Reset all state to initial values
          set({
            user: null,
            tokens: null,
            isLoading: false,
            hasSeenOnboarding: false,
            isAuthenticated: false,
          });

          console.log('All auth data cleared successfully');
        } catch (error) {
          console.error('Error clearing auth data:', error);
        }
      },

      // Internal setters for direct state updates
      setUser: (user: User | null) => {
        const { tokens } = get();
        set({
          user,
          isAuthenticated: !!(user && tokens),
        });
      },
      setTokens: (tokens: AuthTokens | null) => {
        const { user } = get();
        set({
          tokens,
          isAuthenticated: !!(user && tokens),
        });
      },
      setLoading: (isLoading: boolean) => set({ isLoading }),
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist essential data
      partialize: state => ({
        user: state.user,
        tokens: state.tokens,
        hasSeenOnboarding: state.hasSeenOnboarding,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => {
        console.log('Auth store: Starting hydration from AsyncStorage...');
        return (state, error) => {
          if (error) {
            console.error('Auth store hydration error:', error);
          } else {
            console.log('Auth store: Hydration completed', {
              hasUser: !!state?.user,
              hasTokens: !!state?.tokens,
              hasSeenOnboarding: state?.hasSeenOnboarding,
              isAuthenticated: state?.isAuthenticated,
              userProfileStatus: state?.user?.profileStatus,
            });
          }
        };
      },
    },
  ),
);

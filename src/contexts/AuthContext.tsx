import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/api/AuthService';
import { AuthUtils } from '@utils/auth';
import type { AuthTokens, User } from '@types';

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (authData: any) => Promise<void>;
  register: (userData: { email: string; password: string; name: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing authentication on app start
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      setIsLoading(true);
      const authState = await AuthUtils.getAuthState();

      if (authState.isAuthenticated && authState.user && authState.tokens) {
        setTokens(authState.tokens);
        setUser(authState.user);
      } else {
        // Clear any stale data
        setTokens(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      await authService.logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const authData = await authService.login(email, password);
      setTokens(authData.tokens);
      setUser(authData.user);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (authData: any) => {
    try {
      setIsLoading(true);

      // Tokens should already be stored by the OAuth flow
      setTokens(authData.tokens);

      if (authData.user) {
        setUser(authData.user);
      } else {
        // Try to fetch user profile if not provided
        try {
          const userProfile = await authService.getProfile();
          setUser(userProfile);
        } catch (error) {
          console.error('Failed to get user profile after Google login:', error);
        }
      }
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: { email: string; password: string; name: string }) => {
    try {
      setIsLoading(true);
      const authData = await authService.register(userData);
      setTokens(authData.tokens);
      setUser(authData.user);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await authService.logout();
      setTokens(null);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    try {
      if (!tokens) return;
      const userProfile = await authService.getProfile();
      setUser(userProfile);
    } catch (error) {
      console.error('Refresh profile error:', error);
      // If refresh fails, might need to re-authenticate
      await logout();
    }
  };

  const contextValue: AuthContextType = {
    user,
    tokens,
    isAuthenticated: !!(user && tokens),
    isLoading,
    login,
    loginWithGoogle,
    register,
    logout,
    refreshProfile,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

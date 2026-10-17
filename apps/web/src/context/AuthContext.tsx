'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  apiClient,
  type SafeUser,
  type UserProfileResponse,
  type LoginRequest,
  type RegisterRequest,
  type AuthResponse,
} from '@/lib/api-client';
import { isTokenExpired } from '@/lib/jwt';

export interface AuthContextValue {
  user: UserProfileResponse | SafeUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<AuthResponse>;
  register: (data: RegisterRequest) => Promise<AuthResponse>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfileResponse | SafeUser | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    apiClient.auth.logout();
    setTokenState(null);
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const currentToken = apiClient.getToken();
    if (!currentToken || isTokenExpired(currentToken)) {
      logout();
      return;
    }
    try {
      const profile = await apiClient.auth.me();
      setUser(profile);
      setTokenState(currentToken);
    } catch {
      logout();
    }
  }, [logout]);

  // Wire automatic 401 unauthorized listener
  useEffect(() => {
    apiClient.onUnauthorized = () => {
      logout();
    };
    return () => {
      apiClient.onUnauthorized = undefined;
    };
  }, [logout]);

  // Check stored session on mount
  useEffect(() => {
    let mounted = true;
    const initializeSession = async () => {
      setIsLoading(true);
      const storedToken = apiClient.getToken();

      if (!storedToken) {
        if (mounted) {
          setIsLoading(false);
        }
        return;
      }

      // 1. Client-side expiration pre-check
      if (isTokenExpired(storedToken)) {
        if (mounted) {
          logout();
          setIsLoading(false);
        }
        return;
      }

      // 2. Validate token against backend /auth/me
      try {
        const profile = await apiClient.auth.me();
        if (mounted) {
          setUser(profile);
          setTokenState(storedToken);
        }
      } catch {
        if (mounted) {
          logout();
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeSession();
    return () => {
      mounted = false;
    };
  }, [logout]);

  const login = useCallback(async (credentials: LoginRequest): Promise<AuthResponse> => {
    const res = await apiClient.auth.login(credentials);
    setTokenState(res.accessToken);
    setUser(res.user);
    return res;
  }, []);

  const register = useCallback(async (data: RegisterRequest): Promise<AuthResponse> => {
    const res = await apiClient.auth.register(data);
    setTokenState(res.accessToken);
    setUser(res.user);
    return res;
  }, []);

  const value: AuthContextValue = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    login,
    register,
    logout,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

import { useQueryClient } from '@tanstack/react-query';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AUTH_EXPIRED_EVENT, tokenStore } from '../services/api';
import { authApi } from '../services/endpoints';
import type { User } from '../types';

interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  acceptTerms: boolean;
}

interface AuthContextValue {
  user: User | null;
  /** True while the stored token is being validated on first load. */
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(() => tokenStore.get() !== null);
  const queryClient = useQueryClient();

  // validate a stored token once
  useEffect(() => {
    if (!tokenStore.get()) return;
    authApi
      .me()
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  // any 401 from the API means the session is gone
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      queryClient.clear();
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [queryClient]);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean) => {
    const res = await authApi.login(email, password, rememberMe);
    tokenStore.set(res.token, rememberMe);
    queryClient.clear();
    setUser(res.user);
    return res.user;
  }, [queryClient]);

  const register = useCallback(async (input: RegisterInput) => {
    const res = await authApi.register(input);
    tokenStore.set(res.token, false);
    queryClient.clear();
    setUser(res.user);
    return res.user;
  }, [queryClient]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* stateless tokens: nothing to revoke server-side */
    }
    tokenStore.clear();
    queryClient.clear();
    setUser(null);
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, isAdmin: user?.role === 'ADMIN', login, register, logout, setUser }),
    [user, loading, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

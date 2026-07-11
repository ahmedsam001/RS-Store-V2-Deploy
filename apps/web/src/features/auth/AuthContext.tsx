/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { isApiError } from '@/shared/api/api-error';
import { authApi } from '@/features/auth/auth-api';
import type {
  AdminLoginInput,
  AuthUser,
  CustomerLoginInput,
  ProfileUpdateInput,
} from '@/shared/types/AuthTypes';

const AUTH_STORAGE_KEY = 'rs_auth';

function readStoredAuth(): { user: AuthUser | null; csrfToken: string | null } | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as { user: AuthUser | null; csrfToken: string | null };
    if (!parsed.user || !parsed.csrfToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearStoredAuth(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

function writeStoredAuth(user: AuthUser | null, csrfToken: string | null): void {
  if (typeof window === 'undefined') return;
  if (user && csrfToken) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, csrfToken }));
  } else {
    clearStoredAuth();
  }
}

type AuthStatus = 'loading' | 'anonymous' | 'authenticated';

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  csrfToken: string | null;
  refresh: () => Promise<void>;
  customerLogin: (input: CustomerLoginInput) => Promise<void>;
  adminLogin: (input: AdminLoginInput) => Promise<void>;
  logout: (allDevices?: boolean) => Promise<void>;
  updateProfile: (input: ProfileUpdateInput) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const storedAuth = useMemo(() => readStoredAuth(), []);
  const [status, setStatus] = useState<AuthStatus>(storedAuth?.user ? 'authenticated' : 'loading');
  const [user, setUser] = useState<AuthUser | null>(storedAuth?.user ?? null);
  const [csrfToken, setCsrfToken] = useState<string | null>(storedAuth?.csrfToken ?? null);

  useEffect(() => {
    writeStoredAuth(
      status === 'authenticated' ? user : null,
      status === 'authenticated' ? csrfToken : null,
    );
  }, [status, user, csrfToken]);

  const refresh = useCallback(async () => {
    try {
      const response = await authApi.me();
      setUser(response.user);
      setCsrfToken(response.csrfToken);
      setStatus(response.user ? 'authenticated' : 'anonymous');
    } catch (error) {
      if (isApiError(error) && error.status === 304) {
        setStatus((currentStatus) => (currentStatus === 'loading' ? 'anonymous' : currentStatus));
        return;
      }

      if (isApiError(error) && error.status === 401) {
        setUser(null);
        setCsrfToken(null);
        setStatus('anonymous');
        return;
      }

      setStatus((currentStatus) =>
        currentStatus === 'loading' ? 'anonymous' : currentStatus,
      );
    }
  }, []);

  const customerLogin = useCallback(async (input: CustomerLoginInput) => {
    const response = await authApi.customerLogin(input);
    setUser(response.user);
    setCsrfToken(response.csrfToken);
    setStatus('authenticated');
  }, []);

  const adminLogin = useCallback(async (input: AdminLoginInput) => {
    const response = await authApi.adminLogin(input);
    setUser(response.user);
    setCsrfToken(response.csrfToken);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(
    async (allDevices = false) => {
      await authApi.logout(csrfToken, allDevices);
      setUser(null);
      setCsrfToken(null);
      setStatus('anonymous');
    },
    [csrfToken],
  );

  const updateProfile = useCallback(
    async (input: ProfileUpdateInput) => {
      const response = await authApi.updateProfile(input, csrfToken);
      setUser(response.user);
    },
    [csrfToken],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ status, user, csrfToken, refresh, customerLogin, adminLogin, logout, updateProfile }),
    [adminLogin, csrfToken, customerLogin, logout, refresh, status, updateProfile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}

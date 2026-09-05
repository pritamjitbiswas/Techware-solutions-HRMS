import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { api, endpoints } from "../lib/api";
import { appStorage } from "../lib/storage";
import type { Employee, Role, TokenPair } from "../lib/types";

interface AuthContextValue {
  user: Employee | null;
  role: Role | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoadingUser: boolean;
  loginError: string | null;
  login: (officialEmail: string, password: string) => Promise<TokenPair>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  clearLoginError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [isInitializing, setIsInitializing] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(() => Boolean(appStorage.getAccessToken()));

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<Employee>(endpoints.me.root),
    enabled: hasSession && !appStorage.getMustChangePassword(),
    retry: false,
  });

  useEffect(() => {
    setIsInitializing(false);
  }, []);

  const login = useCallback(
    async (officialEmail: string, password: string) => {
      setLoginError(null);
      // Wipe any cached data from a previous session (e.g. a prior user's
      // profile, employee list, attendance) before authenticating as the
      // new user, so nothing stale can leak across accounts.
      queryClient.clear();
      const tokens = await api.post<TokenPair>(endpoints.auth.login, {
        official_email: officialEmail,
        password,
      });
      appStorage.setTokens(tokens.access_token, tokens.refresh_token);
      appStorage.setMetadata({
        role: tokens.role,
        mustChangePassword: tokens.must_change_password,
      });
      if (!tokens.must_change_password) {
        const me = await api.get<Employee>(endpoints.me.root);
        queryClient.setQueryData(["me"], me);
      }
      setHasSession(true);
      return tokens;
    },
    [queryClient],
  );

  const logout = useCallback(() => {
    const refreshToken = appStorage.getRefreshToken();
    if (refreshToken) {
      api
        .post(endpoints.auth.logout, { refresh_token: refreshToken })
        .catch(() => undefined);
    }
    appStorage.clearSession();
    queryClient.clear();
    setHasSession(false);
  }, [queryClient]);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      await api.post(endpoints.auth.changePassword, {
        current_password: currentPassword,
        new_password: newPassword,
      });
      appStorage.setMetadata({
        role: appStorage.getRole() ?? "EMPLOYEE",
        mustChangePassword: false,
      });
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    [queryClient],
  );

  const refreshUser = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["me"] });
  }, [queryClient]);

  const clearLoginError = useCallback(() => setLoginError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: meQuery.data ?? null,
      role: appStorage.getRole(),
      isAuthenticated: hasSession,
      isInitializing,
      isLoadingUser: meQuery.isLoading,
      loginError,
      login,
      logout,
      changePassword,
      refreshUser,
      clearLoginError,
    }),
    [
      meQuery.data,
      meQuery.isLoading,
      hasSession,
      isInitializing,
      loginError,
      login,
      logout,
      changePassword,
      refreshUser,
      clearLoginError,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

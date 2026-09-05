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
  isHydrating: boolean;
  isLoadingUser: boolean;
  mustChangePassword: boolean;
  loginError: string | null;
  login: (officialEmail: string, password: string) => Promise<TokenPair>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  clearLoginError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [isHydrating, setIsHydrating] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    appStorage.hydrate().then(() => {
      setHasSession(Boolean(appStorage.getAccessToken()));
      setIsHydrating(false);
    });
  }, []);

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<Employee>(endpoints.me.root),
    enabled: hasSession && !isHydrating && !appStorage.getMustChangePassword(),
    retry: false,
  });

  const login = useCallback(
    async (officialEmail: string, password: string) => {
      setLoginError(null);
      const tokens = await api.post<TokenPair>(endpoints.auth.login, {
        official_email: officialEmail,
        password,
      });
      await appStorage.setTokens(tokens.access_token, tokens.refresh_token);
      await appStorage.setMetadata({
        role: tokens.role,
        mustChangePassword: tokens.must_change_password,
      });
      setHasSession(true);
      queryClient.setQueryData(["me"], null);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      return tokens;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    const refreshToken = appStorage.getRefreshToken();
    if (refreshToken) {
      api.post(endpoints.auth.logout, { refresh_token: refreshToken }).catch(() => undefined);
    }
    await appStorage.clearSession();
    setHasSession(false);
    queryClient.clear();
  }, [queryClient]);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      await api.post(endpoints.auth.changePassword, {
        current_password: currentPassword,
        new_password: newPassword,
      });
      await appStorage.setMetadata({
        role: appStorage.getRole() ?? "EMPLOYEE",
        mustChangePassword: false,
      });
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    [queryClient],
  );

  const clearLoginError = useCallback(() => setLoginError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: meQuery.data ?? null,
      role: appStorage.getRole(),
      isAuthenticated: hasSession,
      isHydrating,
      isLoadingUser: meQuery.isLoading,
      mustChangePassword: appStorage.getMustChangePassword(),
      loginError,
      login,
      logout,
      changePassword,
      clearLoginError,
    }),
    [meQuery.data, meQuery.isLoading, hasSession, isHydrating, loginError, login, logout, changePassword, clearLoginError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

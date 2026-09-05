import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Role } from "./types";

const ACCESS_TOKEN_KEY = "hrms.access_token";
const REFRESH_TOKEN_KEY = "hrms.refresh_token";
const EXPIRES_AT_KEY = "hrms.expires_at";
const META_KEY = "hrms.meta";

interface SessionMeta {
  role: Role;
  mustChangePassword: boolean;
}

function decodeExpiry(accessToken: string): number {
  const payload = accessToken.split(".")[1];
  const fallback = Date.now() + 15 * 60 * 1000;
  if (!payload) return fallback;
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(globalThis.atob(normalized)) as { exp?: number };
    return decoded.exp ? decoded.exp * 1000 : fallback;
  } catch {
    return fallback;
  }
}

// In-memory mirror so synchronous reads (needed by the fetch layer on every
// request) don't have to await AsyncStorage each time. Hydrated on app start.
let cache: {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  meta: SessionMeta | null;
} = { accessToken: null, refreshToken: null, expiresAt: null, meta: null };

export const appStorage = {
  async hydrate(): Promise<void> {
    const [accessToken, refreshToken, expiresAtRaw, metaRaw] = await Promise.all([
      AsyncStorage.getItem(ACCESS_TOKEN_KEY),
      AsyncStorage.getItem(REFRESH_TOKEN_KEY),
      AsyncStorage.getItem(EXPIRES_AT_KEY),
      AsyncStorage.getItem(META_KEY),
    ]);
    cache = {
      accessToken,
      refreshToken,
      expiresAt: expiresAtRaw ? Number(expiresAtRaw) : null,
      meta: metaRaw ? (JSON.parse(metaRaw) as SessionMeta) : null,
    };
  },

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    const expiresAt = decodeExpiry(accessToken);
    cache.accessToken = accessToken;
    cache.refreshToken = refreshToken;
    cache.expiresAt = expiresAt;
    await Promise.all([
      AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken),
      AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken),
      AsyncStorage.setItem(EXPIRES_AT_KEY, String(expiresAt)),
    ]);
  },

  async setMetadata(meta: SessionMeta): Promise<void> {
    cache.meta = meta;
    await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
  },

  getAccessToken(): string | null {
    return cache.accessToken;
  },

  getRefreshToken(): string | null {
    return cache.refreshToken;
  },

  getExpiresAt(): number | null {
    return cache.expiresAt;
  },

  getRole(): Role | null {
    return cache.meta?.role ?? null;
  },

  getMustChangePassword(): boolean {
    return cache.meta?.mustChangePassword ?? true;
  },

  async clearSession(): Promise<void> {
    cache = { accessToken: null, refreshToken: null, expiresAt: null, meta: null };
    await Promise.all([
      AsyncStorage.removeItem(ACCESS_TOKEN_KEY),
      AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
      AsyncStorage.removeItem(EXPIRES_AT_KEY),
      AsyncStorage.removeItem(META_KEY),
    ]);
  },
};

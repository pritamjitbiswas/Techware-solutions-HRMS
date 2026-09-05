import type { Role } from "./types";

const ACCESS_TOKEN_KEY = "hrms.access_token";
const REFRESH_TOKEN_KEY = "hrms.refresh_token";
const EXPIRES_AT_KEY = "hrms.expires_at";
const META_KEY = "hrms.meta";

interface SessionMeta {
  role: Role;
  mustChangePassword: boolean;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const appStorage = {
  setTokens(accessToken: string, refreshToken: string) {
    const payload = accessToken.split(".")[1];
    let expiresAt = Date.now() + 15 * 60 * 1000;
    if (payload) {
      try {
        const decoded = JSON.parse(
          atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
        ) as { exp?: number };
        if (decoded.exp) expiresAt = decoded.exp * 1000;
      } catch {
        // keep the default fallback
      }
    }
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(EXPIRES_AT_KEY, String(expiresAt));
  },

  setMetadata(meta: SessionMeta) {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  },

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  getExpiresAt(): number | null {
    const raw = localStorage.getItem(EXPIRES_AT_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  },

  getRole(): Role | null {
    return safeParse<SessionMeta>(localStorage.getItem(META_KEY))?.role ?? null;
  },

  getMustChangePassword(): boolean {
    return (
      safeParse<SessionMeta>(localStorage.getItem(META_KEY))
        ?.mustChangePassword ?? true
    );
  },

  clearSession() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);
    localStorage.removeItem(META_KEY);
  },
};

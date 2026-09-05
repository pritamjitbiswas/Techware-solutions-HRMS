import Constants from "expo-constants";

import { appStorage } from "./storage";
import type { Role } from "./types";

const API_BASE_URL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ?? "http://10.0.2.2:8000";

const REFRESH_GRACE_MS = 45_000;

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = appStorage.getRefreshToken();
  if (!refreshToken) throw new ApiError(401, "No refresh token available");

  const res = await fetch(`${API_BASE_URL}/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    await appStorage.clearSession();
    throw new ApiError(res.status, "Session expired. Please sign in again.");
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    must_change_password: boolean;
    role: string;
  };

  await appStorage.setTokens(data.access_token, data.refresh_token);
  await appStorage.setMetadata({
    mustChangePassword: data.must_change_password,
    role: data.role as Role,
  });
  return data.access_token;
}

async function rawRequest<T>(
  path: string,
  options: RequestInit,
  retryOnRefresh: boolean,
): Promise<T> {
  const doFetch = async (token: string | null) => {
    const headers = new Headers(options.headers);
    if (!(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

    if (res.status === 401 && token && retryOnRefresh) {
      const fresh = await (refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      }));
      return doFetch(fresh);
    }

    if (res.status === 204) return undefined as T;

    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      const message =
        (payload && typeof payload.detail === "string" && payload.detail) ||
        (Array.isArray(payload?.detail) &&
          payload.detail[0]?.msg?.replace(/^Value error,\s*/i, "")) ||
        "Something went wrong";
      throw new ApiError(res.status, message, payload?.detail ?? null);
    }

    return payload as T;
  };

  const token = appStorage.getAccessToken();
  const expiresAt = appStorage.getExpiresAt();

  if (
    token &&
    expiresAt &&
    refreshPromise == null &&
    Date.now() > expiresAt - REFRESH_GRACE_MS
  ) {
    await (refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = null;
    }));
    return rawRequest<T>(path, options, false);
  }

  return doFetch(token);
}

export const api = {
  get<T>(path: string) {
    return rawRequest<T>(path, { method: "GET" }, true);
  },

  post<T>(path: string, body?: unknown) {
    return rawRequest<T>(
      path,
      { method: "POST", body: JSON.stringify(body ?? {}) },
      true,
    );
  },

  patch<T>(path: string, body?: unknown) {
    return rawRequest<T>(
      path,
      { method: "PATCH", body: JSON.stringify(body ?? {}) },
      true,
    );
  },
};

export const endpoints = {
  auth: {
    login: "/v1/auth/login",
    refresh: "/v1/auth/refresh",
    logout: "/v1/auth/logout",
    changePassword: "/v1/auth/change-password",
  },
  me: {
    root: "/v1/me",
    attendance: "/v1/me/attendance",
    leaveBalance: "/v1/me/leave-balance",
  },
  attendance: {
    punch: "/v1/attendance/punch",
    today: "/v1/attendance/today",
  },
  leave: {
    requests: "/v1/leave/requests",
    types: "/v1/leave-types",
  },
};

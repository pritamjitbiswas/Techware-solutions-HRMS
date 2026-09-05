import { appStorage } from "./storage";

const getApiBaseUrl = () => {
  if (typeof window !== "undefined") {
    // If accessed through Nginx reverse proxy (port 8080 or port 80), use relative path
    if (window.location.port === "8080" || window.location.port === "80" || window.location.port === "") {
      return "";
    }
    // If accessed on any other port (like 5173), dynamically point to port 8001 on the same machine IP
    const host = window.location.hostname || "localhost";
    const protocol = window.location.protocol || "http:";
    return `${protocol}//${host}:8001`;
  }
  return "http://localhost:8001";
};

const API_BASE_URL = getApiBaseUrl();

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
    appStorage.clearSession();
    throw new ApiError(res.status, "Session expired. Please sign in again.");
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    must_change_password: boolean;
    role: string;
  };

  appStorage.setTokens(data.access_token, data.refresh_token);
  appStorage.setMetadata({
    mustChangePassword: data.must_change_password,
    role: data.role as import("./types").Role,
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
      if (payload?.detail && typeof payload.detail === "object") {
        const first = Array.isArray(payload.detail)
          ? payload.detail[0]
          : payload.detail;
        if (first?.msg) {
          throw new ApiError(res.status, first.msg.replace(/^Value error,\s*/i, ""), payload.detail);
        }
      }
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
      {
        method: "POST",
        body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
      },
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

  delete<T = void>(path: string) {
    return rawRequest<T>(path, { method: "DELETE" }, true);
  },
};

async function fetchBlobWithAuth(path: string, retryOnRefresh: boolean): Promise<Blob> {
  const token = appStorage.getAccessToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE_URL}${path}`, { headers });

  if (res.status === 401 && token && retryOnRefresh) {
    await (refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = null;
    }));
    return fetchBlobWithAuth(path, false);
  }

  if (!res.ok) {
    throw new ApiError(res.status, "Could not download file");
  }
  return res.blob();
}

// For binary downloads (e.g. XLSX reports) that can't go through the JSON api.* helpers.
export async function downloadFile(path: string, filename: string): Promise<void> {
  const blob = await fetchBlobWithAuth(path, true);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export const endpoints = {
  auth: {
    login: "/v1/auth/login",
    refresh: "/v1/auth/refresh",
    logout: "/v1/auth/logout",
    changePassword: "/v1/auth/change-password",
  },
  me: {
    root: "/v1/me",
    profilePicture: "/v1/me/profile-picture",
    attendance: "/v1/me/attendance",
    leaveBalance: "/v1/me/leave-balance",
  },
  employees: "/v1/employees",
  employeeResetPassword: (id: number) => `/v1/employees/${id}/reset-password`,
  finance: (id: number) => `/v1/employees/${id}/finance`,
  attendance: {
    punch: "/v1/attendance/punch",
    today: "/v1/attendance/today",
    matrix: (year: number, month: number) => `/v1/attendance/matrix?year=${year}&month=${month}`,
    syncGoogleSheet: "/v1/attendance/sync-google-sheet",
    list: (id: number) => `/v1/attendance/${id}`,
    override: (id: number) => `/v1/attendance/daily/${id}/override`,
  },
  leave: {
    requests: "/v1/leave/requests",
    approve: (id: number) => `/v1/leave/requests/${id}/approve`,
    reject: (id: number) => `/v1/leave/requests/${id}/reject`,
    cancel: (id: number) => `/v1/leave/requests/${id}/cancel`,
  },
  regularisations: {
    root: "/v1/regularisations",
    approve: (id: number) => `/v1/regularisations/${id}/approve`,
    reject: (id: number) => `/v1/regularisations/${id}/reject`,
  },
  config: {
    departments: "/v1/departments",
    designations: "/v1/designations",
    shifts: "/v1/shifts",
    holidays: "/v1/holidays",
    leaveTypes: "/v1/leave-types",
  },
  reports: {
    attendanceSummary: "/v1/reports/attendance-summary",
    leaveSummary: "/v1/reports/leave-summary",
  },
  auditLog: "/v1/audit-log",
};

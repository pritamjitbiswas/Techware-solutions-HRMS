import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";

import { api, endpoints } from "./api";
import type { AttendanceDay, LeaveBalance, LeaveRequest, LeaveType, PunchRecord } from "./types";

function toQuery(params: Record<string, string | number | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function useMyPunchesToday() {
  return useQuery({
    queryKey: ["me", "punches-today"],
    queryFn: () => api.get<PunchRecord[]>(endpoints.attendance.today),
  });
}

export class LocationPermissionDeniedError extends Error {
  constructor() {
    super("Location permission is required to punch in or out on mobile.");
    this.name = "LocationPermissionDeniedError";
  }
}

async function captureRequiredGeo() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new LocationPermissionDeniedError();
  }
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy_metres: position.coords.accuracy,
    is_mock_location: position.mocked ?? false,
  };
}

export function usePunch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (directionHint: "in" | "out") => {
      const geo = await captureRequiredGeo();
      return api.post<PunchRecord>(endpoints.attendance.punch, {
        client_punch_id:
          globalThis.crypto?.randomUUID?.() ??
          `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        source: "mobile",
        direction_hint: directionHint,
        geo,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "punches-today"] });
      queryClient.invalidateQueries({ queryKey: ["me", "attendance"] });
    },
  });
}

export function useMyAttendance(year: number, month: number) {
  return useQuery({
    queryKey: ["me", "attendance", year, month],
    queryFn: () => {
      const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const to = `${year}-${String(month + 1).padStart(2, "0")}-${lastDay}`;
      return api.get<AttendanceDay[]>(`${endpoints.me.attendance}${toQuery({ from, to })}`);
    },
  });
}

export function useLeaveBalance() {
  return useQuery({
    queryKey: ["me", "leave-balance"],
    queryFn: () => api.get<LeaveBalance[]>(endpoints.me.leaveBalance),
  });
}

export function useLeaveTypes() {
  return useQuery({
    queryKey: ["leave-types"],
    queryFn: () => api.get<LeaveType[]>(endpoints.leave.types),
  });
}

export function useLeaveRequests() {
  return useQuery({
    queryKey: ["leave-requests"],
    queryFn: () => api.get<LeaveRequest[]>(endpoints.leave.requests),
  });
}

export interface ApplyLeavePayload {
  leave_type_id: number;
  from_date: string;
  to_date: string;
  is_half_day: boolean;
  reason: string;
}

export function useApplyLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ApplyLeavePayload) => api.post<LeaveRequest>(endpoints.leave.requests, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["me", "leave-balance"] });
    },
  });
}

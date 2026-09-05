import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, ApiError, endpoints } from "../lib/api";
import { demo } from "../lib/demo";
import type { Regularisation } from "../lib/demo";
import type {
  AttendanceDay,
  AttendanceSummaryRow,
  AuditLog,
  Department,
  Designation,
  Employee,
  EmployeeFinance,
  Holiday,
  LeaveBalance,
  LeaveRequest,
  LeaveType,
  PunchRecord,
  Shift,
} from "../lib/types";
import { toQuery } from "../lib/utils";

/* ---------- helpers ---------- */

function isUnavailable(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 404 || error.status === 405 || error.status === 501)
  );
}

const DEMO_DELAY = 350;

function withDemoDelay<T>(value: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), DEMO_DELAY);
  });
}

/* ---------- employees ---------- */

export interface EmployeeFilters {
  department?: number | null;
  status?: string | null;
  q?: string | null;
}

export function useEmployees(filters: EmployeeFilters = {}) {
  return useQuery({
    queryKey: ["employees", filters],
    queryFn: async () => {
      try {
        return await api.get<Employee[]>(
          `${endpoints.employees}${toQuery({
            department: filters.department,
            status: filters.status,
            q: filters.q,
          })}`,
        );
      } catch (error) {
        if (!isUnavailable(error)) throw error;
        let rows = demo.employees;
        if (filters.department) {
          rows = rows.filter((e) => e.department_id === filters.department);
        }
        if (filters.status) {
          rows = rows.filter((e) => e.employment_status === filters.status);
        }
        if (filters.q) {
          const q = filters.q.toLowerCase();
          rows = rows.filter(
            (e) =>
              e.full_name.toLowerCase().includes(q) ||
              e.employee_code.toLowerCase().includes(q) ||
              e.official_email.toLowerCase().includes(q),
          );
        }
        return withDemoDelay(rows);
      }
    },
  });
}

export function useEmployee(id: number | undefined) {
  return useQuery({
    queryKey: ["employees", id],
    enabled: id != null,
    queryFn: async () => {
      try {
        return await api.get<Employee>(`${endpoints.employees}/${id}`);
      } catch (error) {
        if (!isUnavailable(error)) throw error;
        const found = demo.employees.find((e) => e.id === id);
        return withDemoDelay(found ?? demo.employees[0]!);
      }
    },
  });
}

export function useEmployeeFinance(id: number | undefined) {
  return useQuery({
    queryKey: ["employees", id, "finance"],
    enabled: id != null,
    queryFn: async () => {
      try {
        return await api.get<EmployeeFinance>(endpoints.finance(id!));
      } catch (error) {
        if (!isUnavailable(error)) throw error;
        return withDemoDelay(demo.finance(id!));
      }
    },
  });
}

export function useAdminResetPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      employeeId,
      newPassword,
      mustChangePassword = false,
    }: {
      employeeId: number;
      newPassword: string;
      mustChangePassword?: boolean;
    }) => {
      return await api.post<{ message: string }>(
        endpoints.employeeResetPassword(employeeId),
        {
          new_password: newPassword,
          must_change_password: mustChangePassword,
        },
      );
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["employees", vars.employeeId] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

/* ---------- config lookups ---------- */

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      try {
        return await api.get<Department[]>(endpoints.config.departments);
      } catch (error) {
        if (!isUnavailable(error)) throw error;
        return withDemoDelay(demo.departments);
      }
    },
  });
}

export function useDesignations() {
  return useQuery({
    queryKey: ["designations"],
    queryFn: async () => {
      try {
        return await api.get<Designation[]>(endpoints.config.designations);
      } catch (error) {
        if (!isUnavailable(error)) throw error;
        return withDemoDelay(demo.designations);
      }
    },
  });
}

export function useCreateDesignation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { title: string; level?: number | null; is_active?: boolean }) => {
      return await api.post<Designation>(endpoints.config.designations, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["designations"] });
    },
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; code: string; is_active?: boolean }) => {
      return await api.post<Department>(endpoints.config.departments, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useShifts() {
  return useQuery({
    queryKey: ["shifts"],
    queryFn: async () => {
      try {
        return await api.get<Shift[]>(endpoints.config.shifts);
      } catch (error) {
        if (!isUnavailable(error)) throw error;
        return withDemoDelay(demo.shifts);
      }
    },
  });
}

export function useCreateShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      start_time: string;
      end_time: string;
      grace_in_minutes?: number;
      grace_out_minutes?: number;
      break_minutes?: number;
      full_day_minutes?: number;
      half_day_minutes?: number;
      crosses_midnight?: boolean;
      is_active?: boolean;
    }) => {
      return await api.post<Shift>(endpoints.config.shifts, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-matrix"] });
    },
  });
}

export function useHolidays() {
  return useQuery({
    queryKey: ["holidays"],
    queryFn: async () => {
      try {
        return await api.get<Holiday[]>(endpoints.config.holidays);
      } catch (error) {
        if (!isUnavailable(error)) throw error;
        return withDemoDelay(demo.holidays);
      }
    },
  });
}

export function useLeaveTypes() {
  return useQuery({
    queryKey: ["leave-types"],
    queryFn: async () => {
      try {
        return await api.get<LeaveType[]>(endpoints.config.leaveTypes);
      } catch (error) {
        if (!isUnavailable(error)) throw error;
        return withDemoDelay(demo.leaveTypes);
      }
    },
  });
}

/* ---------- attendance ---------- */

export function useMyAttendance(year: number, month: number) {
  return useQuery({
    queryKey: ["me", "attendance", year, month],
    queryFn: async () => {
      const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const to = `${year}-${String(month + 1).padStart(2, "0")}-${new Date(
        year,
        month + 1,
        0,
      ).getDate()}`;
      try {
        return await api.get<AttendanceDay[]>(
          `${endpoints.me.attendance}${toQuery({ from, to })}`,
        );
      } catch (error) {
        if (!isUnavailable(error)) throw error;
        return withDemoDelay(demo.attendanceMonth(4, year, month));
      }
    },
  });
}

export function useMyPunchesToday() {
  return useQuery({
    queryKey: ["me", "punches-today"],
    queryFn: async () => {
      try {
        return await api.get<PunchRecord[]>(endpoints.attendance.today);
      } catch (error) {
        if (!isUnavailable(error)) throw error;
        return withDemoDelay(demo.punchesToday(4));
      }
    },
  });
}

export interface MatrixHeader {
  day: number;
  date: string;
  weekday: string;
  label: string;
  is_weekend: boolean;
}

export interface MatrixShiftLegend {
  code: string;
  name: string;
  start: string;
  end: string;
  description: string;
}

export interface MatrixDay {
  day: number;
  date: string;
  code: string;
  status: string;
  worked_minutes?: number | null;
}

export interface MatrixRow {
  s_no: number;
  employee_id: number;
  employee_code: string;
  full_name: string;
  official_email: string;
  designation: string;
  shift_code: string;
  shift_name: string;
  days: MatrixDay[];
}

export interface AttendanceMatrixResponse {
  year: number;
  month: number;
  num_days: number;
  headers: MatrixHeader[];
  shifts_legend: MatrixShiftLegend[];
  rows: MatrixRow[];
}

export function useAttendanceMatrix(year: number, month: number) {
  return useQuery({
    queryKey: ["attendance-matrix", year, month],
    queryFn: async () => {
      const backendMonth = month + 1;
      return await api.get<AttendanceMatrixResponse>(
        endpoints.attendance.matrix(year, backendMonth),
      );
    },
  });
}

export function useSyncGoogleSheet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return await api.post<{
        status: string;
        message: string;
        employees_synced: number;
        records_synced: number;
        synced_at: string;
      }>(endpoints.attendance.syncGoogleSheet);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-matrix"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export function useTeamAttendance(
  employeeId: number | undefined,
  year: number,
  month: number,
) {
  return useQuery({
    queryKey: ["attendance", employeeId, year, month],
    enabled: employeeId != null,
    queryFn: async () => {
      const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const to = `${year}-${String(month + 1).padStart(2, "0")}-${new Date(
        year,
        month + 1,
        0,
      ).getDate()}`;
      try {
        return await api.get<AttendanceDay[]>(
          `${endpoints.attendance.list(employeeId!)}${toQuery({ from, to })}`,
        );
      } catch (error) {
        if (!isUnavailable(error)) throw error;
        return withDemoDelay(demo.attendanceMonth(employeeId!, year, month));
      }
    },
  });
}

export interface PunchGeoInput {
  latitude: number;
  longitude: number;
  accuracy_metres?: number | null;
  is_mock_location?: boolean | null;
}

function safeUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // Fall through to fallback
    }
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function usePunch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      directionHint,
      geo,
    }: {
      directionHint: "in" | "out";
      geo?: PunchGeoInput | null;
    }) => {
      try {
        return await api.post<PunchRecord>(endpoints.attendance.punch, {
          client_punch_id: safeUUID(),
          source: "web",
          direction_hint: directionHint,
          geo: geo ?? null,
        });
      } catch (error) {
        if (!isUnavailable(error)) throw error;
        const punches = demo.punchesToday(4);
        const last = punches[punches.length - 1]!;
        return withDemoDelay({ ...last, direction_hint: directionHint });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "punches-today"] });
      queryClient.invalidateQueries({ queryKey: ["me", "attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-matrix"] });
    },
  });
}

/* ---------- leave ---------- */

export function useLeaveBalance() {
  return useQuery({
    queryKey: ["me", "leave-balance"],
    queryFn: async () => {
      try {
        return await api.get<LeaveBalance[]>(endpoints.me.leaveBalance);
      } catch (error) {
        if (!isUnavailable(error)) throw error;
        return withDemoDelay(demo.leaveBalances);
      }
    },
  });
}

export function useLeaveRequests(status?: string) {
  return useQuery({
    queryKey: ["leave-requests", status],
    queryFn: async () => {
      try {
        return await api.get<LeaveRequest[]>(
          `${endpoints.leave.requests}${toQuery({ status })}`,
        );
      } catch (error) {
        if (!isUnavailable(error)) throw error;
        let rows = demo.leaveRequests;
        if (status) {
          rows = rows.filter((r) => r.status === status);
        }
        return withDemoDelay(rows);
      }
    },
  });
}

export interface ApplyLeavePayload {
  leave_type_id: number;
  from_date: string;
  to_date: string;
  is_half_day: boolean;
  half_day_session?: "first" | "second" | null;
  reason: string;
}

export function useApplyLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ApplyLeavePayload) =>
      api.post<LeaveRequest>(endpoints.leave.requests, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["me", "leave-balance"] });
    },
  });
}

export function useRegularisations(status?: string) {
  return useQuery({
    queryKey: ["regularisations", status],
    queryFn: async () => {
      try {
        return await api.get<Regularisation[]>(
          `${endpoints.regularisations.root}${toQuery({ status })}`,
        );
      } catch (error) {
        if (!isUnavailable(error)) throw error;
        let rows = demo.regularisations;
        if (status) {
          rows = rows.filter((r) => r.status === status);
        }
        return withDemoDelay(rows);
      }
    },
  });
}

export interface CreateRegularisationPayload {
  work_date: string;
  requested_in_time?: string | null;
  requested_out_time?: string | null;
  reason: string;
}

export function useCreateRegularisation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRegularisationPayload) =>
      api.post<Regularisation>(endpoints.regularisations.root, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regularisations"] });
    },
  });
}

/* ---------- reports ---------- */

export function useAttendanceSummary(month: string, department: number | null) {
  return useQuery({
    queryKey: ["reports", "attendance-summary", month, department],
    queryFn: () =>
      api.get<AttendanceSummaryRow[]>(
        `${endpoints.reports.attendanceSummary}${toQuery({ month, department })}`,
      ),
  });
}

/* ---------- admin ---------- */

export function useAuditLog() {
  return useQuery({
    queryKey: ["audit-log"],
    queryFn: async () => {
      try {
        return await api.get<AuditLog[]>(endpoints.auditLog);
      } catch (error) {
        if (!isUnavailable(error)) throw error;
        return withDemoDelay(demo.auditLogs());
      }
    },
  });
}

/* ---------- mutations ---------- */

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.post<{ employee: Employee; temporary_password: string }>(
        endpoints.employees,
        payload,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Record<string, unknown>;
    }) => api.patch<Employee>(`${endpoints.employees}/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useUpdateFinance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Record<string, unknown>;
    }) => api.patch<EmployeeFinance>(endpoints.finance(id), payload),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["employees", vars.id, "finance"],
      });
    },
  });
}

export function useUploadProfilePicture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return api.post<Employee>(endpoints.me.profilePicture, form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

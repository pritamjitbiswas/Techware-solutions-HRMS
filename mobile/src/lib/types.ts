export type Role = "EMPLOYEE" | "MANAGER" | "HR" | "ADMIN";

export type EmploymentType = "full_time" | "part_time" | "intern" | "contract";
export type WorkLocation = "office" | "remote" | "hybrid";
export type EmploymentStatus = "active" | "on_notice" | "exited";

export interface Employee {
  id: number;
  employee_code: string;
  full_name: string;
  official_email: string;
  date_of_joining: string;
  designation_id: number | null;
  department_id: number | null;
  reporting_manager_id: number | null;
  employment_type: EmploymentType;
  shift_id: number | null;
  work_location: WorkLocation;
  employment_status: EmploymentStatus;
  date_of_exit: string | null;

  date_of_birth: string | null;
  personal_mobile: string | null;
  personal_email: string | null;
  current_address: string | null;
  permanent_address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_number: string | null;
  emergency_contact_relation: string | null;
  blood_group: string | null;
  profile_picture_url: string | null;

  role: Role;
  is_active: boolean;

  created_at: string;
  updated_at: string;
}

export type AttendanceStatusName =
  | "present"
  | "absent"
  | "half_day"
  | "on_leave"
  | "holiday"
  | "weekly_off"
  | "pending";

export interface AttendanceDay {
  id: number;
  employee_id: number;
  work_date: string;
  shift_id: number | null;
  first_in_utc: string | null;
  last_out_utc: string | null;
  worked_minutes: number;
  break_minutes: number;
  overtime_minutes: number;
  late_by_minutes: number;
  early_out_minutes: number;
  status: AttendanceStatusName;
  is_manual_override: boolean;
  override_reason: string | null;
}

export interface PunchRecord {
  id: number;
  employee_id: number;
  punch_time_utc: string;
  source: "web" | "mobile";
  direction_hint: "in" | "out" | "unknown";
  latitude: number | null;
  longitude: number | null;
  accuracy_metres: number | null;
  is_mock_location: boolean | null;
  geo_flag: string | null;
}

export interface LeaveType {
  id: number;
  name: string;
  code: string;
  annual_quota: number;
  accrual: "yearly" | "monthly";
  carry_forward_max: number;
  is_paid: boolean;
  requires_document: boolean;
  is_active: boolean;
}

export interface LeaveBalance {
  id: number;
  employee_id: number;
  leave_type_id: number;
  year: number;
  opening: string;
  accrued: string;
  used: string;
  pending: string;
  closing: string;
  leave_type: LeaveType | null;
}

export interface LeaveRequest {
  id: number;
  employee_id: number;
  leave_type_id: number;
  from_date: string;
  to_date: string;
  is_half_day: boolean;
  half_day_session: "first" | "second" | null;
  total_days: string;
  reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  approver_id: number | null;
  approver_comment: string | null;
  applied_at: string;
  actioned_at: string | null;
  leave_type: LeaveType | null;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  must_change_password: boolean;
  role: Role;
}

import type {
  AttendanceDay,
  AttendanceStatusName,
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
} from "./types";

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const EMPLOYEES: Employee[] = [
  {
    id: 1,
    employee_code: "ACT-0001",
    full_name: "Aisha Admin",
    official_email: "admin@company.local",
    date_of_joining: "2025-02-10",
    designation_id: 6,
    department_id: 4,
    reporting_manager_id: null,
    employment_type: "full_time",
    shift_id: 1,
    work_location: "office",
    employment_status: "active",
    date_of_exit: null,
    date_of_birth: "1990-04-12",
    personal_mobile: "9820000001",
    personal_email: "aisha.a@gmail.com",
    current_address: "12 Palm Avenue, Ahmedabad",
    permanent_address: "12 Palm Avenue, Ahmedabad",
    emergency_contact_name: "Ravi Admin",
    emergency_contact_number: "9820000002",
    emergency_contact_relation: "Spouse",
    blood_group: "B+",
    profile_picture_url: null,
    role: "ADMIN",
    is_active: true,
    created_at: "2025-02-10T10:00:00Z",
    updated_at: "2025-02-10T10:00:00Z",
  },
  {
    id: 2,
    employee_code: "ACT-0002",
    full_name: "Harsh Rao",
    official_email: "hr@company.local",
    date_of_joining: "2025-03-01",
    designation_id: 4,
    department_id: 3,
    reporting_manager_id: 1,
    employment_type: "full_time",
    shift_id: 1,
    work_location: "office",
    employment_status: "active",
    date_of_exit: null,
    date_of_birth: "1992-08-22",
    personal_mobile: "9820000101",
    personal_email: "harsh.rao@gmail.com",
    current_address: "8 Lake View, Ahmedabad",
    permanent_address: "45 Old City Road, Baroda",
    emergency_contact_name: "Sneha Rao",
    emergency_contact_number: "9820000102",
    emergency_contact_relation: "Sister",
    blood_group: "O+",
    profile_picture_url: null,
    role: "HR",
    is_active: true,
    created_at: "2025-03-01T10:00:00Z",
    updated_at: "2025-03-01T10:00:00Z",
  },
  {
    id: 3,
    employee_code: "ACT-0003",
    full_name: "Meera Menon",
    official_email: "manager@company.local",
    date_of_joining: "2024-06-15",
    designation_id: 2,
    department_id: 1,
    reporting_manager_id: 1,
    employment_type: "full_time",
    shift_id: 1,
    work_location: "hybrid",
    employment_status: "active",
    date_of_exit: null,
    date_of_birth: "1989-11-03",
    personal_mobile: "9820000201",
    personal_email: "meera.m@gmail.com",
    current_address: "3 Riverbank Residency, Ahmedabad",
    permanent_address: "3 Riverbank Residency, Ahmedabad",
    emergency_contact_name: "Arjun Menon",
    emergency_contact_number: "9820000202",
    emergency_contact_relation: "Husband",
    blood_group: "A+",
    profile_picture_url: null,
    role: "MANAGER",
    is_active: true,
    created_at: "2024-06-15T10:00:00Z",
    updated_at: "2024-06-15T10:00:00Z",
  },
  {
    id: 4,
    employee_code: "ACT-0004",
    full_name: "Ela Employee",
    official_email: "employee4@company.local",
    date_of_joining: "2025-05-20",
    designation_id: 1,
    department_id: 1,
    reporting_manager_id: 3,
    employment_type: "full_time",
    shift_id: 1,
    work_location: "office",
    employment_status: "active",
    date_of_exit: null,
    date_of_birth: "1996-01-15",
    personal_mobile: "9820000301",
    personal_email: "ela.e@gmail.com",
    current_address: "22 Sector 7, Gandhinagar",
    permanent_address: "78 Village Road, Mehsana",
    emergency_contact_name: "Kiran Employee",
    emergency_contact_number: "9820000302",
    emergency_contact_relation: "Father",
    blood_group: "AB+",
    profile_picture_url: null,
    role: "EMPLOYEE",
    is_active: true,
    created_at: "2025-05-20T10:00:00Z",
    updated_at: "2025-05-20T10:00:00Z",
  },
  {
    id: 5,
    employee_code: "ACT-0005",
    full_name: "Nikhil Naidu",
    official_email: "employee5@company.local",
    date_of_joining: "2025-07-01",
    designation_id: 1,
    department_id: 2,
    reporting_manager_id: 3,
    employment_type: "full_time",
    shift_id: 1,
    work_location: "remote",
    employment_status: "active",
    date_of_exit: null,
    date_of_birth: "1994-09-09",
    personal_mobile: "9820000401",
    personal_email: "nikhil.n@gmail.com",
    current_address: "5 Tech Park, Hyderabad",
    permanent_address: "5 Tech Park, Hyderabad",
    emergency_contact_name: "Padma Naidu",
    emergency_contact_number: "9820000402",
    emergency_contact_relation: "Mother",
    blood_group: "B-",
    profile_picture_url: null,
    role: "EMPLOYEE",
    is_active: true,
    created_at: "2025-07-01T10:00:00Z",
    updated_at: "2025-07-01T10:00:00Z",
  },
  {
    id: 6,
    employee_code: "ACT-0006",
    full_name: "Priya Patel",
    official_email: "employee6@company.local",
    date_of_joining: "2025-02-01",
    designation_id: 5,
    department_id: 4,
    reporting_manager_id: 3,
    employment_type: "full_time",
    shift_id: 2,
    work_location: "office",
    employment_status: "active",
    date_of_exit: null,
    date_of_birth: "1991-12-30",
    personal_mobile: "9820000501",
    personal_email: "priya.p@gmail.com",
    current_address: "99 Ring Road, Ahmedabad",
    permanent_address: "99 Ring Road, Ahmedabad",
    emergency_contact_name: "Suresh Patel",
    emergency_contact_number: "9820000502",
    emergency_contact_relation: "Father",
    blood_group: "O-",
    profile_picture_url: null,
    role: "EMPLOYEE",
    is_active: true,
    created_at: "2025-02-01T10:00:00Z",
    updated_at: "2025-02-01T10:00:00Z",
  },
  {
    id: 7,
    employee_code: "ACT-0007",
    full_name: "Rohan Kapoor",
    official_email: "rohan@company.local",
    date_of_joining: "2024-11-11",
    designation_id: 1,
    department_id: 1,
    reporting_manager_id: 3,
    employment_type: "contract",
    shift_id: 1,
    work_location: "hybrid",
    employment_status: "on_notice",
    date_of_exit: null,
    date_of_birth: "1993-03-18",
    personal_mobile: "9820000601",
    personal_email: "rohan.k@gmail.com",
    current_address: "14 Bungalow Road, Delhi",
    permanent_address: "14 Bungalow Road, Delhi",
    emergency_contact_name: "Anita Kapoor",
    emergency_contact_number: "9820000602",
    emergency_contact_relation: "Mother",
    blood_group: "A-",
    profile_picture_url: null,
    role: "EMPLOYEE",
    is_active: true,
    created_at: "2024-11-11T10:00:00Z",
    updated_at: "2024-11-11T10:00:00Z",
  },
];

export const DEPARTMENTS: Department[] = [
  { id: 1, name: "Engineering", code: "ENG", is_active: true },
  { id: 2, name: "Finance", code: "FIN", is_active: true },
  { id: 3, name: "Human Resources", code: "HR", is_active: true },
  { id: 4, name: "Operations", code: "OPS", is_active: true },
];

export const DESIGNATIONS: Designation[] = [
  { id: 1, title: "Software Engineer", level: 2, is_active: true },
  { id: 2, title: "Engineering Manager", level: 4, is_active: true },
  { id: 3, title: "HR Executive", level: 2, is_active: true },
  { id: 4, title: "HR Manager", level: 4, is_active: true },
  { id: 5, title: "System Administrator", level: 3, is_active: true },
  { id: 6, title: "Operations Associate", level: 1, is_active: true },
];

export const SHIFTS: Shift[] = [
  {
    id: 1,
    name: "Day Shift",
    start_time: "09:30:00",
    end_time: "18:30:00",
    grace_in_minutes: 10,
    grace_out_minutes: 10,
    break_minutes: 60,
    full_day_minutes: 480,
    half_day_minutes: 240,
    crosses_midnight: false,
    is_active: true,
  },
  {
    id: 2,
    name: "Night Shift",
    start_time: "22:00:00",
    end_time: "06:00:00",
    grace_in_minutes: 10,
    grace_out_minutes: 10,
    break_minutes: 60,
    full_day_minutes: 480,
    half_day_minutes: 240,
    crosses_midnight: true,
    is_active: true,
  },
];

export const HOLIDAYS: Holiday[] = [
  { id: 1, holiday_date: `${new Date().getFullYear()}-01-26`, name: "Republic Day", is_optional: false },
  { id: 2, holiday_date: `${new Date().getFullYear()}-05-01`, name: "Labour Day", is_optional: false },
  { id: 3, holiday_date: `${new Date().getFullYear()}-08-15`, name: "Independence Day", is_optional: false },
  { id: 4, holiday_date: `${new Date().getFullYear()}-10-02`, name: "Gandhi Jayanti", is_optional: false },
  { id: 5, holiday_date: `${new Date().getFullYear()}-11-13`, name: "Diwali", is_optional: true },
  { id: 6, holiday_date: `${new Date().getFullYear()}-12-25`, name: "Christmas", is_optional: false },
];

export const LEAVE_TYPES: LeaveType[] = [
  { id: 1, name: "Casual Leave", code: "CL", annual_quota: 12, accrual: "monthly", carry_forward_max: 0, is_paid: true, requires_document: false, is_active: true },
  { id: 2, name: "Sick Leave", code: "SL", annual_quota: 12, accrual: "monthly", carry_forward_max: 0, is_paid: true, requires_document: false, is_active: true },
  { id: 3, name: "Earned Leave", code: "EL", annual_quota: 15, accrual: "yearly", carry_forward_max: 30, is_paid: true, requires_document: false, is_active: true },
  { id: 4, name: "Maternity Leave", code: "ML", annual_quota: 182, accrual: "yearly", carry_forward_max: 0, is_paid: true, requires_document: true, is_active: true },
  { id: 5, name: "Loss of Pay", code: "LOP", annual_quota: 0, accrual: "yearly", carry_forward_max: 0, is_paid: false, requires_document: false, is_active: true },
];

export const LEAVE_BALANCES: LeaveBalance[] = [
  { id: 1, employee_id: 4, leave_type_id: 1, year: new Date().getFullYear(), opening: 0, accrued: 7, used: 3, pending: 1, closing: 3, leave_type: LEAVE_TYPES[0] },
  { id: 2, employee_id: 4, leave_type_id: 2, year: new Date().getFullYear(), opening: 0, accrued: 7, used: 1, pending: 0, closing: 6, leave_type: LEAVE_TYPES[1] },
  { id: 3, employee_id: 4, leave_type_id: 3, year: new Date().getFullYear(), opening: 5, accrued: 0, used: 2, pending: 0, closing: 3, leave_type: LEAVE_TYPES[2] },
  { id: 4, employee_id: 4, leave_type_id: 5, year: new Date().getFullYear(), opening: 0, accrued: 0, used: 0, pending: 0, closing: 0, leave_type: LEAVE_TYPES[4] },
];

export const LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: 1,
    employee_id: 4,
    leave_type_id: 1,
    from_date: isoDaysFromNow(7),
    to_date: isoDaysFromNow(8),
    is_half_day: false,
    half_day_session: null,
    total_days: 2,
    reason: "Family function in hometown",
    status: "pending",
    approver_id: 3,
    approver_comment: null,
    applied_at: isoDaysFromNow(-1),
    actioned_at: null,
    employee: EMPLOYEES[3],
    leave_type: LEAVE_TYPES[0],
  },
  {
    id: 2,
    employee_id: 5,
    leave_type_id: 2,
    from_date: isoDaysFromNow(3),
    to_date: isoDaysFromNow(3),
    is_half_day: false,
    half_day_session: null,
    total_days: 1,
    reason: "Viral fever, doctor visit",
    status: "pending",
    approver_id: 3,
    approver_comment: null,
    applied_at: isoDaysFromNow(-2),
    actioned_at: null,
    employee: EMPLOYEES[4],
    leave_type: LEAVE_TYPES[1],
  },
  {
    id: 3,
    employee_id: 6,
    leave_type_id: 1,
    from_date: isoDaysFromNow(-10),
    to_date: isoDaysFromNow(-9),
    is_half_day: false,
    half_day_session: null,
    total_days: 2,
    reason: "Personal work",
    status: "approved",
    approver_id: 3,
    approver_comment: "Approved. Please ensure handover.",
    applied_at: isoDaysFromNow(-15),
    actioned_at: isoDaysFromNow(-14),
    employee: EMPLOYEES[5],
    leave_type: LEAVE_TYPES[0],
  },
  {
    id: 4,
    employee_id: 4,
    leave_type_id: 2,
    from_date: isoDaysFromNow(-20),
    to_date: isoDaysFromNow(-20),
    is_half_day: false,
    half_day_session: null,
    total_days: 1,
    reason: "Migraine",
    status: "rejected",
    approver_id: 3,
    approver_comment: "Please provide a medical certificate.",
    applied_at: isoDaysFromNow(-22),
    actioned_at: isoDaysFromNow(-21),
    employee: EMPLOYEES[3],
    leave_type: LEAVE_TYPES[1],
  },
  {
    id: 5,
    employee_id: 7,
    leave_type_id: 3,
    from_date: isoDaysFromNow(12),
    to_date: isoDaysFromNow(16),
    is_half_day: false,
    half_day_session: null,
    total_days: 5,
    reason: "Year-end vacation",
    status: "pending",
    approver_id: 3,
    approver_comment: null,
    applied_at: isoDaysFromNow(-1),
    actioned_at: null,
    employee: EMPLOYEES[6],
    leave_type: LEAVE_TYPES[2],
  },
];

export interface Regularisation {
  id: number;
  employee_id: number;
  work_date: string;
  requested_in_time: string | null;
  requested_out_time: string | null;
  reason: string;
  status: "pending" | "approved" | "rejected";
  approver_id: number | null;
  approver_comment: string | null;
  applied_at: string;
  actioned_at: string | null;
  employee?: Employee;
}

export const REGULARISATIONS: Regularisation[] = [
  {
    id: 1,
    employee_id: 4,
    work_date: isoDaysFromNow(-2),
    requested_in_time: "09:28",
    requested_out_time: "18:35",
    reason: "Punched 2 minutes late because the gate scanner queue was long.",
    status: "pending",
    approver_id: 3,
    approver_comment: null,
    applied_at: isoDaysFromNow(-1),
    actioned_at: null,
    employee: EMPLOYEES[3],
  },
  {
    id: 2,
    employee_id: 5,
    work_date: isoDaysFromNow(-4),
    requested_in_time: "09:40",
    requested_out_time: "18:30",
    reason: "Train was delayed by 40 minutes.",
    status: "pending",
    approver_id: 3,
    approver_comment: null,
    applied_at: isoDaysFromNow(-3),
    actioned_at: null,
    employee: EMPLOYEES[4],
  },
  {
    id: 3,
    employee_id: 6,
    work_date: isoDaysFromNow(-30),
    requested_in_time: "21:45",
    requested_out_time: "06:10",
    reason: "Night shift arrival, network was down for punch.",
    status: "approved",
    approver_id: 3,
    approver_comment: "OK, verified with security logs.",
    applied_at: isoDaysFromNow(-29),
    actioned_at: isoDaysFromNow(-28),
    employee: EMPLOYEES[5],
  },
];

/* ---------- attendance ---------- */

function attendanceStatusFor(date: Date): AttendanceStatusName {
  const day = date.getDay();
  if (day === 0) return "weekly_off";
  if (day === 6 && Math.random() < 0.4) return "weekly_off";
  const holiday = HOLIDAYS[Math.floor(Math.random() * HOLIDAYS.length)]!;
  if (date.toISOString().slice(0, 10) === holiday.holiday_date) return "holiday";
  const roll = Math.random();
  if (roll < 0.08) return "absent";
  if (roll < 0.14) return "half_day";
  if (roll < 0.17) return "on_leave";
  if (roll < 0.2) return "pending";
  return "present";
}

export function demoAttendanceMonth(
  employeeId: number,
  year: number,
  month: number,
): AttendanceDay[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: AttendanceDay[] = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day, 12, 0, 0);
    const status = attendanceStatusFor(date);
    const isPresent =
      status === "present" || status === "half_day" || status === "pending";
    days.push({
      id: 1000 + day,
      employee_id: employeeId,
      work_date: date.toISOString().slice(0, 10),
      shift_id: employeeId % 2 === 0 ? 1 : 2,
      first_in_utc: isPresent
        ? `${date.toISOString().slice(0, 10)}T04:0${day % 4}:00Z`
        : null,
      last_out_utc: isPresent
        ? status === "half_day"
          ? `${date.toISOString().slice(0, 10)}T08:0${day % 4}:00Z`
          : `${date.toISOString().slice(0, 10)}T13:0${day % 4}:00Z`
        : null,
      worked_minutes: isPresent ? (status === "half_day" ? 240 : 450 + day) : 0,
      break_minutes: isPresent && status !== "half_day" ? 60 : 0,
      overtime_minutes: isPresent ? (day % 5 === 0 ? 45 : 0) : 0,
      late_by_minutes: isPresent && day % 4 === 0 ? 5 : 0,
      early_out_minutes: 0,
      status,
      is_manual_override: false,
      override_reason: null,
    });
  }
  return days;
}

export function demoPunchesToday(employeeId: number): PunchRecord[] {
  const now = new Date();
  const base = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    4,
    1,
    0,
  );
  return [
    {
      id: 1,
      employee_id: employeeId,
      punch_time_utc: base.toISOString(),
      source: "web",
      direction_hint: "in",
      latitude: null,
      longitude: null,
      accuracy_metres: null,
      is_mock_location: null,
    },
    {
      id: 2,
      employee_id: employeeId,
      punch_time_utc: new Date(
        base.getTime() + 8 * 60 * 60 * 1000,
      ).toISOString(),
      source: "web",
      direction_hint: "out",
      latitude: null,
      longitude: null,
      accuracy_metres: null,
      is_mock_location: null,
    },
  ];
}

/* ---------- finance ---------- */

function demoFinance(employeeId: number): EmployeeFinance {
  return {
    employee_id: employeeId,
    ctc_annual: (840000 + employeeId * 120000).toString(),
    pan_number: `ABCDE${1234 + employeeId}F`,
    pf_uan: `PF${1000000000 + employeeId}`,
    bank_account_number: `502000${100000 + employeeId}`,
    bank_ifsc: "HDFC0001234",
    bank_name: "HDFC Bank",
    updated_by: 2,
    updated_at: new Date().toISOString(),
  };
}

/* ---------- audit ---------- */

const AUDIT_ACTIONS = ["create", "update", "role_change", "override", "approve"];
const AUDIT_ENTITIES = [
  "employee",
  "attendance_daily",
  "leave_request",
  "employee_finance",
  "regularisation_request",
];

export function demoAuditLogs(): AuditLog[] {
  return Array.from({ length: 18 }, (_, i) => {
    const created = new Date(Date.now() - (i + 1) * 7 * 60 * 60 * 1000);
    const actor = EMPLOYEES[(i + 1) % EMPLOYEES.length]!;
    return {
      id: i + 1,
      actor_user_id: actor.id,
      entity_type: AUDIT_ENTITIES[i % AUDIT_ENTITIES.length]!,
      entity_id: i + 10,
      action: AUDIT_ACTIONS[i % AUDIT_ACTIONS.length]!,
      before_json: i % 2 === 0 ? { employment_status: "active" } : null,
      after_json: i % 2 === 0 ? { employment_status: "on_notice" } : null,
      ip_address: `192.168.1.${10 + i}`,
      created_at: created.toISOString(),
    };
  });
}

export const demo = {
  employees: EMPLOYEES,
  departments: DEPARTMENTS,
  designations: DESIGNATIONS,
  shifts: SHIFTS,
  holidays: HOLIDAYS,
  leaveTypes: LEAVE_TYPES,
  leaveBalances: LEAVE_BALANCES,
  leaveRequests: LEAVE_REQUESTS,
  regularisations: REGULARISATIONS,
  attendanceMonth: demoAttendanceMonth,
  punchesToday: demoPunchesToday,
  finance: demoFinance,
  auditLogs: demoAuditLogs,
};

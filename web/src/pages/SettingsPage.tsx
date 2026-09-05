import { useState } from "react";
import type { FormEvent } from "react";
import type { UseQueryResult } from "@tanstack/react-query";

import { useAuth } from "../auth/AuthContext";
import { PageHeader } from "../components/ui/PageHeader";
import { Spinner } from "../components/ui/States";
import {
  useCreateDepartment,
  useCreateDesignation,
  useCreateShift,
  useDepartments,
  useDesignations,
  useHolidays,
  useLeaveTypes,
  useShifts,
} from "../hooks/useData";
import { formatDate } from "../lib/utils";
import { Modal } from "../components/ui/Modal";

type Tab = "shifts" | "holidays" | "leave-types" | "departments" | "designations";

const TABS: { value: Tab; label: string }[] = [
  { value: "designations", label: "Roles & Designations" },
  { value: "departments", label: "Departments" },
  { value: "shifts", label: "Shifts" },
  { value: "holidays", label: "Holidays" },
  { value: "leave-types", label: "Leave types" },
];

export function SettingsPage() {
  const { role } = useAuth();
  const [tab, setTab] = useState<Tab>("designations");

  // Only ADMIN can add users, roles/designations, and shift timings
  const canManage = role === "ADMIN";

  // Designation Modal state
  const [showDesigModal, setShowDesigModal] = useState(false);
  const [desigTitle, setDesigTitle] = useState("");
  const [desigLevel, setDesigLevel] = useState<number>(2);
  const [desigActive, setDesigActive] = useState(true);
  const [desigError, setDesigError] = useState<string | null>(null);

  // Department Modal state
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptName, setDeptName] = useState("");
  const [deptCode, setDeptCode] = useState("");
  const [deptActive, setDeptActive] = useState(true);
  const [deptError, setDeptError] = useState<string | null>(null);

  // Shift Timing Modal state
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftName, setShiftName] = useState("");
  const [shiftStart, setShiftStart] = useState("09:30");
  const [shiftEnd, setShiftEnd] = useState("19:00");
  const [shiftGraceIn, setShiftGraceIn] = useState(15);
  const [shiftGraceOut, setShiftGraceOut] = useState(15);
  const [shiftBreak, setShiftBreak] = useState(60);
  const [shiftCrossesMidnight, setShiftCrossesMidnight] = useState(false);
  const [shiftActive, setShiftActive] = useState(true);
  const [shiftError, setShiftError] = useState<string | null>(null);

  const shifts = useShifts();
  const holidays = useHolidays();
  const leaveTypes = useLeaveTypes();
  const departments = useDepartments();
  const designations = useDesignations();

  const createDesignationMutation = useCreateDesignation();
  const createDepartmentMutation = useCreateDepartment();
  const createShiftMutation = useCreateShift();

  const queries: Record<Tab, UseQueryResult<unknown, Error>> = {
    shifts,
    holidays,
    "leave-types": leaveTypes,
    departments,
    designations,
  };

  const data = queries[tab].data;
  const isLoading = queries[tab].isLoading;

  const handleCreateDesignation = (e: FormEvent) => {
    e.preventDefault();
    setDesigError(null);
    if (!desigTitle.trim()) {
      setDesigError("Please enter a designation title");
      return;
    }
    createDesignationMutation.mutate(
      {
        title: desigTitle.trim(),
        level: desigLevel,
        is_active: desigActive,
      },
      {
        onSuccess: () => {
          setShowDesigModal(false);
          setDesigTitle("");
          setDesigLevel(2);
          setDesigActive(true);
        },
        onError: (err) => {
          setDesigError(err instanceof Error ? err.message : "Could not create designation");
        },
      },
    );
  };

  const handleCreateDepartment = (e: FormEvent) => {
    e.preventDefault();
    setDeptError(null);
    if (!deptName.trim() || !deptCode.trim()) {
      setDeptError("Please enter both department name and code");
      return;
    }
    createDepartmentMutation.mutate(
      {
        name: deptName.trim(),
        code: deptCode.trim().toUpperCase(),
        is_active: deptActive,
      },
      {
        onSuccess: () => {
          setShowDeptModal(false);
          setDeptName("");
          setDeptCode("");
          setDeptActive(true);
        },
        onError: (err) => {
          setDeptError(err instanceof Error ? err.message : "Could not create department");
        },
      },
    );
  };

  const handleCreateShift = (e: FormEvent) => {
    e.preventDefault();
    setShiftError(null);
    if (!shiftName.trim()) {
      setShiftError("Please enter a shift name");
      return;
    }
    if (!shiftStart || !shiftEnd) {
      setShiftError("Please specify both start and end times");
      return;
    }

    createShiftMutation.mutate(
      {
        name: shiftName.trim(),
        start_time: shiftStart.length === 5 ? `${shiftStart}:00` : shiftStart,
        end_time: shiftEnd.length === 5 ? `${shiftEnd}:00` : shiftEnd,
        grace_in_minutes: shiftGraceIn,
        grace_out_minutes: shiftGraceOut,
        break_minutes: shiftBreak,
        crosses_midnight: shiftCrossesMidnight,
        is_active: shiftActive,
      },
      {
        onSuccess: () => {
          setShowShiftModal(false);
          setShiftName("");
          setShiftStart("09:30");
          setShiftEnd("19:00");
          setShiftCrossesMidnight(false);
          setShiftActive(true);
        },
        onError: (err) => {
          setShiftError(err instanceof Error ? err.message : "Could not create shift timing");
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          title="Organization Settings"
          subtitle="Configure system integration roles, departments, shifts, and leave policies."
        />
        {canManage && tab === "designations" && (
          <button
            type="button"
            onClick={() => setShowDesigModal(true)}
            className="btn-primary btn-sm flex items-center gap-1.5 shadow-sm"
          >
            <span>+</span> Add New Role / Designation
          </button>
        )}
        {canManage && tab === "departments" && (
          <button
            type="button"
            onClick={() => setShowDeptModal(true)}
            className="btn-primary btn-sm flex items-center gap-1.5 shadow-sm"
          >
            <span>+</span> Add Department
          </button>
        )}
        {canManage && tab === "shifts" && (
          <button
            type="button"
            onClick={() => setShowShiftModal(true)}
            className="btn-primary btn-sm flex items-center gap-1.5 shadow-sm"
          >
            <span>+</span> Add Shift Timing
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {TABS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setTab(item.value)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              tab === item.value
                ? "bg-brand text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Spinner label="Loading settings…" />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  {getHeaders(tab).map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {getRows(tab, data).map((row, index) => (
                  <tr key={index}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className={cellIndex === 0 ? "font-bold text-slate-800" : ""}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add New Role / Designation */}
      <Modal open={showDesigModal} onClose={() => setShowDesigModal(false)} title="Add New Role / Designation">
        <p className="-mt-2 mb-4 text-xs text-ink-light">e.g. Senior Network Engineer, System Administrator</p>
        <form onSubmit={handleCreateDesignation} className="space-y-4">
              {desigError && (
                <div className="p-3 rounded-lg bg-danger-light border border-danger/30 text-xs font-semibold text-danger">
                  {desigError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Designation / Role Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Network Security Engineer"
                  value={desigTitle}
                  onChange={(e) => setDesigTitle(e.target.value)}
                  className="input"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Seniority Level
                </label>
                <select
                  value={desigLevel}
                  onChange={(e) => setDesigLevel(Number(e.target.value))}
                  className="input"
                >
                  <option value={1}>Level 1 — Associate / Junior Specialist</option>
                  <option value={2}>Level 2 — Mid-Level / Senior Engineer (L2)</option>
                  <option value={3}>Level 3 — Lead Engineer / Solutions Architect (L3)</option>
                  <option value={4}>Level 4 — Manager / NOC Operations Lead</option>
                  <option value={5}>Level 5 — Director / VP of Infrastructure</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="desig-active"
                  type="checkbox"
                  checked={desigActive}
                  onChange={(e) => setDesigActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                />
                <label htmlFor="desig-active" className="text-xs font-medium text-slate-700 select-none">
                  Active (available for employee assignment)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDesigModal(false)}
                  className="btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createDesignationMutation.isPending}
                  className="btn-primary btn-sm"
                >
                  {createDesignationMutation.isPending ? "Creating…" : "Create Role"}
                </button>
              </div>
            </form>
      </Modal>

      {/* Modal: Add Department */}
      <Modal open={showDeptModal} onClose={() => setShowDeptModal(false)} title="Add New Department">
        <p className="-mt-2 mb-4 text-xs text-ink-light">Create a business or operational unit</p>
        <form onSubmit={handleCreateDepartment} className="space-y-4">
              {deptError && (
                <div className="p-3 rounded-lg bg-danger-light border border-danger/30 text-xs font-semibold text-danger">
                  {deptError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Department Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cloud & DevOps Engineering"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="input"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Department Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CLOUD, NOC, SEC"
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                  className="input font-mono uppercase"
                  maxLength={10}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="dept-active"
                  type="checkbox"
                  checked={deptActive}
                  onChange={(e) => setDeptActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                />
                <label htmlFor="dept-active" className="text-xs font-medium text-slate-700 select-none">
                  Active department
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createDepartmentMutation.isPending}
                  className="btn-primary btn-sm"
                >
                  {createDepartmentMutation.isPending ? "Creating…" : "Create Department"}
                </button>
              </div>
            </form>
      </Modal>

      {/* Modal: Add Shift Timing */}
      <Modal open={showShiftModal} onClose={() => setShowShiftModal(false)} title="Add Shift Timing" wide>
        <p className="-mt-2 mb-4 text-xs text-ink-light">Configure operational working hours and grace windows</p>
        <form onSubmit={handleCreateShift} className="space-y-4">
              {shiftError && (
                <div className="p-3 rounded-lg bg-danger-light border border-danger/30 text-xs font-semibold text-danger">
                  {shiftError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Shift Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shift D (Weekend 10:00 AM - 6:00 PM)"
                  value={shiftName}
                  onChange={(e) => setShiftName(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={shiftStart}
                    onChange={(e) => setShiftStart(e.target.value)}
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={shiftEnd}
                    onChange={(e) => setShiftEnd(e.target.value)}
                    className="input text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Grace In (mins)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={shiftGraceIn}
                    onChange={(e) => setShiftGraceIn(Number(e.target.value))}
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Grace Out (mins)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={shiftGraceOut}
                    onChange={(e) => setShiftGraceOut(Number(e.target.value))}
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Break (mins)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={180}
                    value={shiftBreak}
                    onChange={(e) => setShiftBreak(Number(e.target.value))}
                    className="input text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="shift-midnight"
                  type="checkbox"
                  checked={shiftCrossesMidnight}
                  onChange={(e) => setShiftCrossesMidnight(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                />
                <label htmlFor="shift-midnight" className="text-xs font-medium text-slate-700 select-none">
                  Overnight Shift (crosses midnight into next day)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="shift-active"
                  type="checkbox"
                  checked={shiftActive}
                  onChange={(e) => setShiftActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                />
                <label htmlFor="shift-active" className="text-xs font-medium text-slate-700 select-none">
                  Active (available for employee assignment)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowShiftModal(false)}
                  className="btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createShiftMutation.isPending}
                  className="btn-primary btn-sm"
                >
                  {createShiftMutation.isPending ? "Creating…" : "Save Shift Timing"}
                </button>
              </div>
            </form>
      </Modal>
    </div>
  );
}

type Row = string[];

function getHeaders(tab: Tab): string[] {
  switch (tab) {
    case "shifts":
      return ["Shift", "Timing", "Grace in/out", "Break", "Full day", "Active"];
    case "holidays":
      return ["Date", "Name", "Optional"];
    case "leave-types":
      return ["Name", "Code", "Quota", "Accrual", "Carry fwd", "Paid"];
    case "departments":
      return ["Name", "Code", "Active"];
    case "designations":
      return ["Role / Title", "Level", "Active"];
  }
}

function getRows(tab: Tab, data: unknown): Row[] {
  if (!data || !Array.isArray(data)) return [];

  if (tab === "shifts") {
    return (data as ShiftRow[]).map((row) => [
      row.name,
      `${row.start_time.slice(0, 5)} – ${row.end_time.slice(0, 5)}${row.crosses_midnight ? " (overnight)" : ""}`,
      `${row.grace_in_minutes}/${row.grace_out_minutes} min`,
      `${row.break_minutes} min`,
      `${row.full_day_minutes} min`,
      row.is_active ? "Yes" : "No",
    ]);
  }
  if (tab === "holidays") {
    return (data as HolidayRow[]).map((row) => [
      formatDate(row.holiday_date),
      row.name,
      row.is_optional ? "Optional" : "Mandatory",
    ]);
  }
  if (tab === "leave-types") {
    return (data as LeaveTypeRow[]).map((row) => [
      row.name,
      row.code,
      String(row.annual_quota),
      row.accrual,
      String(row.carry_forward_max),
      row.is_paid ? "Paid" : "Unpaid",
    ]);
  }
  if (tab === "departments") {
    return (data as DepartmentRow[]).map((row) => [
      row.name,
      row.code,
      row.is_active ? "Yes" : "No",
    ]);
  }
  return (data as DesignationRow[]).map((row) => [
    row.title,
    row.level != null ? `Level ${row.level}` : "—",
    row.is_active ? "Yes" : "No",
  ]);
}

interface ShiftRow {
  name: string;
  start_time: string;
  end_time: string;
  crosses_midnight: boolean;
  grace_in_minutes: number;
  grace_out_minutes: number;
  break_minutes: number;
  full_day_minutes: number;
  is_active: boolean;
}

interface HolidayRow {
  holiday_date: string;
  name: string;
  is_optional: boolean;
}

interface LeaveTypeRow {
  name: string;
  code: string;
  annual_quota: number;
  accrual: string;
  carry_forward_max: number;
  is_paid: boolean;
}

interface DepartmentRow {
  name: string;
  code: string;
  is_active: boolean;
}

interface DesignationRow {
  title: string;
  level: number | null;
  is_active: boolean;
}

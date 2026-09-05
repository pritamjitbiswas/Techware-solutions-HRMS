import { useMemo, useState } from "react";
import type { FormEvent } from "react";

import { AttendanceBadge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState, Spinner } from "../components/ui/States";
import {
  IconChevronLeft,
  IconChevronRight,
  IconClock,
} from "../components/icons";
import { useCreateRegularisation, useMyAttendance } from "../hooks/useData";
import type { AttendanceDay } from "../lib/types";
import {
  ATTENDANCE_STATUS_META,
  formatDate,
  formatMinutes,
  formatTime,
  toIsoDate,
} from "../lib/utils";

const EMPTY_REG_FORM = { inTime: "", outTime: "", reason: "" };

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function AttendancePage() {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<AttendanceDay | null>(null);
  const [regOpen, setRegOpen] = useState(false);
  const [regForm, setRegForm] = useState(EMPTY_REG_FORM);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSubmitted, setRegSubmitted] = useState(false);
  const regularisationMutation = useCreateRegularisation();

  const selectDay = (day: AttendanceDay) => {
    setSelected(day);
    setRegOpen(false);
    setRegForm(EMPTY_REG_FORM);
    setRegError(null);
    setRegSubmitted(false);
  };

  const handleRequestRegularisation = (event: FormEvent) => {
    event.preventDefault();
    setRegError(null);
    if (!selected) return;
    if (!regForm.inTime && !regForm.outTime) {
      setRegError("Provide at least an in-time or out-time.");
      return;
    }
    if (!regForm.reason.trim()) {
      setRegError("Please explain what happened.");
      return;
    }
    regularisationMutation.mutate(
      {
        work_date: selected.work_date,
        requested_in_time: regForm.inTime ? `${regForm.inTime}:00` : null,
        requested_out_time: regForm.outTime ? `${regForm.outTime}:00` : null,
        reason: regForm.reason,
      },
      {
        onSuccess: () => {
          setRegSubmitted(true);
          setRegOpen(false);
        },
        onError: (error) => {
          setRegError(error instanceof Error ? error.message : "Could not submit request");
        },
      },
    );
  };

  const { data: days, isLoading } = useMyAttendance(year, month);

  const grid = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (AttendanceDay | null)[] = Array(startOffset).fill(null);
    const byDate = new Map((days ?? []).map((d) => [d.work_date, d]));
    for (let d = 1; d <= daysInMonth; d += 1) {
      const iso = toIsoDate(year, month, d);
      cells.push(byDate.get(iso) ?? null);
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [days, year, month]);

  const moveMonth = (delta: number) => {
    const nextYear = month + delta < 0 ? year - 1 : month + delta > 11 ? year + 1 : year;
    const nextMonth = (month + delta + 12) % 12;
    setYear(nextYear);
    setMonth(nextMonth);
  };

  const summary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const day of days ?? []) {
      counts.set(day.status, (counts.get(day.status) ?? 0) + 1);
    }
    return counts;
  }, [days]);

  return (
    <div>
      <PageHeader
        title="My Attendance"
        subtitle="Calendar view, colour-coded by day status."
        actions={
          <div className="flex items-center gap-2">
            <button type="button" className="btn-secondary btn-sm" onClick={() => moveMonth(-1)}>
              <IconChevronLeft width={14} height={14} />
            </button>
            <span className="min-w-40 text-center font-display text-sm font-bold">
              {MONTHS[month]} {year}
            </span>
            <button type="button" className="btn-secondary btn-sm" onClick={() => moveMonth(1)}>
              <IconChevronRight width={14} height={14} />
            </button>
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {Object.entries(ATTENDANCE_STATUS_META).map(([key, meta]) => (
          <span key={key} className={`chip ${meta.className}`}>
            <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
            {meta.label} · {summary.get(key as AttendanceDay["status"]) ?? 0}
          </span>
        ))}
      </div>

      {isLoading ? (
        <Spinner label="Loading attendance…" />
      ) : (
        <>
          <div className="card overflow-hidden p-4">
            <div className="mb-2 grid grid-cols-7 gap-1 px-1">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="text-center font-display text-xs font-semibold uppercase tracking-wide text-ink-light"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {grid.map((cell, index) => {
                if (!cell) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }
                const meta = ATTENDANCE_STATUS_META[cell.status];
                const isToday =
                  cell.work_date === toIsoDate(today.getFullYear(), today.getMonth(), today.getDate());
                return (
                  <button
                    key={cell.id}
                    type="button"
                    onClick={() => selectDay(cell)}
                    className={`flex aspect-square flex-col items-center justify-center rounded-xl border-2 font-display transition-transform hover:-translate-y-0.5 ${meta.className} ${
                      isToday ? "ring-2 ring-ink ring-offset-2" : ""
                    }`}
                  >
                    <span className="text-lg font-bold">{Number(cell.work_date.slice(8, 10))}</span>
                    <span className="hidden text-[10px] font-semibold sm:block">
                      {cell.status === "present" ? "●" : meta.label.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {days && days.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="No attendance records"
                description="No punches or computed records exist for this month."
              />
            </div>
          ) : null}
        </>
      )}

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? formatDate(selected.work_date) : ""}
      >
        {selected ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <AttendanceBadge status={selected.status} />
              {selected.is_manual_override ? (
                <span className="chip border-accent bg-accent-light text-accent-dark">HR override</span>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-paper p-3 text-center">
                <p className="font-display text-xs font-semibold uppercase text-ink-light">First in</p>
                <p className="font-display text-base font-bold">{formatTime(selected.first_in_utc)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-paper p-3 text-center">
                <p className="font-display text-xs font-semibold uppercase text-ink-light">Last out</p>
                <p className="font-display text-base font-bold">{formatTime(selected.last_out_utc)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-paper p-3 text-center">
                <p className="font-display text-xs font-semibold uppercase text-ink-light">Worked</p>
                <p className="font-display text-base font-bold">{formatMinutes(selected.worked_minutes)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-paper p-3 text-center">
                <p className="font-display text-xs font-semibold uppercase text-ink-light">Overtime</p>
                <p className="font-display text-base font-bold">{formatMinutes(selected.overtime_minutes)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-brand-light px-4 py-3">
              <IconClock width={16} height={16} className="text-brand-dark" />
              <p className="text-sm font-semibold text-brand-dark">
                Late by {formatMinutes(selected.late_by_minutes)} · Early out by {formatMinutes(selected.early_out_minutes)}
              </p>
            </div>

            {regSubmitted ? (
              <div className="rounded-xl border border-slate-200 bg-success-light px-4 py-3 text-sm font-semibold text-success">
                Regularisation request submitted for your manager's review.
              </div>
            ) : regOpen ? (
              <form onSubmit={handleRequestRegularisation} className="space-y-3 rounded-xl border border-slate-200 bg-paper p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="regInTime" className="label">Correct in-time</label>
                    <input
                      id="regInTime"
                      type="time"
                      className="input"
                      value={regForm.inTime}
                      onChange={(event) => setRegForm({ ...regForm, inTime: event.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="regOutTime" className="label">Correct out-time</label>
                    <input
                      id="regOutTime"
                      type="time"
                      className="input"
                      value={regForm.outTime}
                      onChange={(event) => setRegForm({ ...regForm, outTime: event.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="regReason" className="label">Reason</label>
                  <textarea
                    id="regReason"
                    className="input min-h-20 resize-y"
                    placeholder="What happened?"
                    value={regForm.reason}
                    onChange={(event) => setRegForm({ ...regForm, reason: event.target.value })}
                  />
                </div>
                {regError ? (
                  <p className="rounded-xl border border-danger bg-danger-light px-4 py-3 text-sm font-semibold text-ink">
                    {regError}
                  </p>
                ) : null}
                <div className="flex justify-end gap-3">
                  <button type="button" className="btn-secondary btn-sm" onClick={() => setRegOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary btn-sm" disabled={regularisationMutation.isPending}>
                    {regularisationMutation.isPending ? "Submitting…" : "Submit request"}
                  </button>
                </div>
              </form>
            ) : (
              <button type="button" className="btn-secondary w-full justify-center" onClick={() => setRegOpen(true)}>
                Request regularisation for this day
              </button>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

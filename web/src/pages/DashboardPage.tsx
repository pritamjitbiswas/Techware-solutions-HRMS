import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { Spinner, EmptyState } from "../components/ui/States";
import { Avatar } from "../components/ui/Avatar";
import { AttendanceBadge, LeaveStatusBadge } from "../components/ui/Badge";
import {
  IconCalendar,
  IconChart,
  IconClock,
  IconHome,
  IconPunch,
  IconX,
} from "../components/icons";
import {
  useLeaveBalance,
  useLeaveRequests,
  useMyAttendance,
  useMyPunchesToday,
  usePunch,
  type PunchGeoInput,
} from "../hooks/useData";
import { formatMinutes, formatTime } from "../lib/utils";

function capturePunchGeo(): Promise<PunchGeoInput | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      resolve(null);
      return;
    }
    const timer = setTimeout(() => resolve(null), 800);
    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timer);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy_metres: position.coords.accuracy,
            is_mock_location: false,
          });
        },
        () => {
          clearTimeout(timer);
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 800, maximumAge: 60000 },
      );
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}

function WebClockInCard() {
  const { data: punches, isLoading: punchesLoading } = useMyPunchesToday();
  const punchMutation = usePunch();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [punchError, setPunchError] = useState<string | null>(null);
  const [punchSuccess, setPunchSuccess] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const lastPunch = punches?.[punches.length - 1];
  const isClockedIn = lastPunch?.direction_hint?.toLowerCase() === "in";

  // Calculate elapsed worked time if first punch is in
  const firstIn = punches?.[0]?.punch_time_utc;
  let elapsedMinutes = 0;
  if (firstIn) {
    const firstInDate = new Date(firstIn);
    const diffMs = Math.max(0, currentTime.getTime() - firstInDate.getTime());
    elapsedMinutes = Math.floor(diffMs / (1000 * 60));
  }

  const shiftTotalMinutes = 480; // 8 hours
  const progressPct = Math.min(100, Math.round((elapsedMinutes / shiftTotalMinutes) * 100));

  const handlePunch = async () => {
    setPunchError(null);
    setPunchSuccess(null);
    setIsSubmitting(true);
    try {
      const geo = await capturePunchGeo();
      const targetDirection = isClockedIn ? "out" : "in";
      punchMutation.mutate(
        { directionHint: targetDirection, geo },
        {
          onSuccess: () => {
            setPunchSuccess(
              targetDirection === "out"
                ? `Clock-Out recorded at ${new Date().toLocaleTimeString()}`
                : `Clock-In recorded at ${new Date().toLocaleTimeString()}`
            );
          },
          onError: (err) => {
            setPunchError(err instanceof Error ? err.message : "Punch recording failed");
          },
          onSettled: () => {
            setIsSubmitting(false);
          },
        }
      );
    } catch (err) {
      setIsSubmitting(false);
      setPunchError(err instanceof Error ? err.message : "Could not process punch");
    }
  };

  return (
    <div className="card p-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-light text-accent-dark border border-accent/30 shadow-sm">
            <IconClock width={18} height={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Web Clock-In</h2>
            <p className="text-[11px] text-slate-500 font-medium">Log your daily work shift</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600 border border-slate-200">
            General Shift (09:30 AM - 06:30 PM)
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            isClockedIn ? "bg-success-light text-success border border-success/30" : "bg-slate-100 text-slate-600 border border-slate-200"
          }`}>
            <span className={`h-2 w-2 rounded-full ${isClockedIn ? "bg-success animate-pulse" : "bg-slate-400"}`} />
            {isClockedIn ? "Clocked In" : "Clocked Out"}
          </span>
        </div>
      </div>

      {/* Main Clock Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-5">
        {/* Left: Live Clock & Action */}
        <div className="md:col-span-5 flex flex-col items-center justify-center text-center p-4 rounded-xl bg-slate-50/60 border border-slate-100">
          <div className="font-mono text-3xl font-extrabold tracking-tight text-slate-900">
            {currentTime.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
              timeZone: "Asia/Kolkata",
            })}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-1">
            {currentTime.toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "short",
              year: "numeric",
              timeZone: "Asia/Kolkata",
            })}
          </div>

          {/* Keka signature action button */}
          <div className="mt-5 w-full space-y-2">
            <button
              type="button"
              onClick={handlePunch}
              disabled={punchMutation.isPending || punchesLoading || isSubmitting}
              className={`w-full py-3 px-4 rounded-xl font-display text-sm font-bold tracking-wide transition-all duration-200 shadow-lg flex items-center justify-center gap-2.5 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-60 disabled:translate-y-0 cursor-pointer text-white hover:brightness-105 ${
                isClockedIn ? "bg-danger-gradient shadow-danger/30" : "bg-accent-gradient shadow-accent/30"
              }`}
            >
              <IconPunch width={18} height={18} />
              <span>
                {punchMutation.isPending || isSubmitting
                  ? "RECORDING PUNCH…"
                  : isClockedIn
                  ? "Web Clock-Out"
                  : "Web Clock-In"}
              </span>
            </button>

            {punchError && (
              <div className="p-2.5 rounded-lg bg-danger-light border border-danger/30 text-xs font-semibold text-danger flex items-center justify-between">
                <span>{punchError}</span>
                <button type="button" onClick={() => setPunchError(null)} className="hover:opacity-70 ml-2">
                  <IconX width={12} height={12} />
                </button>
              </div>
            )}

            {punchSuccess && (
              <div className="p-2.5 rounded-lg bg-success-light border border-success/30 text-xs font-semibold text-success flex items-center justify-between">
                <span>{punchSuccess}</span>
                <button type="button" onClick={() => setPunchSuccess(null)} className="hover:opacity-70 ml-2">
                  <IconX width={12} height={12} />
                </button>
              </div>
            )}
          </div>

          {lastPunch ? (
            <p className="mt-2.5 text-[11px] text-slate-500 font-medium">
              Last punch: <span className="font-bold text-slate-700 font-mono">{formatTime(lastPunch.punch_time_utc)}</span> ({lastPunch.direction_hint.toUpperCase()})
            </p>
          ) : (
            <p className="mt-2.5 text-[11px] text-slate-400 font-medium">No punches logged today yet</p>
          )}
        </div>

        {/* Right: Shift Progression & Metrics */}
        <div className="md:col-span-7 flex flex-col justify-between space-y-4">
          {/* Progress bar of 8h shift */}
          <div className="space-y-1.5 p-4 rounded-xl bg-slate-50/60 border border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Today's Shift Progress</span>
              <span className="font-mono font-bold text-brand">{progressPct}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isClockedIn ? "bg-gradient-to-r from-brand to-brand-600" : "bg-slate-400"
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
              <span>Worked: <strong className="text-slate-800 font-mono">{formatMinutes(elapsedMinutes)}</strong></span>
              <span>Target: <strong className="text-slate-800 font-mono">8h 00m</strong></span>
            </div>
          </div>

          {/* 4 Metric Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="rounded-lg border border-slate-200/80 bg-white p-2.5 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">First In</div>
              <div className="text-xs font-bold text-slate-800 font-mono mt-0.5">
                {firstIn ? formatTime(firstIn) : "—"}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200/80 bg-white p-2.5 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last Out</div>
              <div className="text-xs font-bold text-slate-800 font-mono mt-0.5">
                {isClockedIn ? "—" : lastPunch ? formatTime(lastPunch.punch_time_utc) : "—"}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200/80 bg-white p-2.5 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Effective</div>
              <div className="text-xs font-bold text-brand font-mono mt-0.5">
                {formatMinutes(elapsedMinutes)}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200/80 bg-white p-2.5 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gross Hours</div>
              <div className="text-xs font-bold text-slate-800 font-mono mt-0.5">
                {formatMinutes(elapsedMinutes)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { user, role } = useAuth();
  const now = useMemo(() => new Date(), []);
  const [month] = useState(now.getMonth());
  const [year] = useState(now.getFullYear());

  const { data: attendance, isLoading: attendanceLoading } = useMyAttendance(year, month);
  const { data: leaveBalances } = useLeaveBalance();
  const { data: leaveRequests } = useLeaveRequests();

  const monthlyStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const day of attendance ?? []) {
      counts.set(day.status, (counts.get(day.status) ?? 0) + 1);
    }
    const worked = (attendance ?? []).reduce(
      (sum, day) =>
        sum + (day.status === "present" || day.status === "half_day" ? day.worked_minutes : 0),
      0,
    );
    return { counts, worked };
  }, [attendance]);

  const pendingLeaves = (leaveRequests ?? []).filter((r) => r.status === "pending").length;

  const isPeopleOps = role === "HR" || role === "ADMIN";
  const isManager = role === "MANAGER" || isPeopleOps;

  const hr = now.getHours();
  const greeting = hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      {/* Keka Welcome Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {greeting}, {user?.full_name?.split(" ")[0] ?? "Employee"}! 👋
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Welcome to Techware HRMS. Here is your daily summary and quick actions.
          </p>
        </div>

        {/* Quick Keka Action Shortcuts */}
        <div className="flex items-center gap-2">
          <Link
            to="/leave"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <IconCalendar width={14} height={14} className="text-brand" />
            Apply Leave
          </Link>
          <Link
            to="/attendance"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <IconClock width={14} height={14} className="text-accent" />
            My Log
          </Link>
          {isPeopleOps ? (
            <Link
              to="/employees/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-brand-dark transition-colors"
            >
              <span>+</span> Add Employee
            </Link>
          ) : null}
        </div>
      </div>

      {/* Primary Web Clock-In Widget */}
      <WebClockInCard />

      {/* Metrics Row: 4 Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="card p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-light text-success border border-success/30 shadow-sm">
            <IconHome width={18} height={18} />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Present Days</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{monthlyStats.counts.get("present") ?? 0}</div>
            <div className="text-[10px] text-slate-500">this month</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-light text-accent-dark border border-accent/30 shadow-sm">
            <IconClock width={18} height={18} />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Worked</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{formatMinutes(monthlyStats.worked)}</div>
            <div className="text-[10px] text-slate-500">logged hours</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-light text-brand border border-brand-100 shadow-sm">
            <IconCalendar width={18} height={18} />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending Leave</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{pendingLeaves}</div>
            <div className="text-[10px] text-slate-500">in approval pipeline</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-danger-light text-danger border border-danger/30 shadow-sm">
            <IconChart width={18} height={18} />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Days Absent</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{monthlyStats.counts.get("absent") ?? 0}</div>
            <div className="text-[10px] text-slate-500">unplanned leaves</div>
          </div>
        </div>
      </div>

      {/* Leave Balances & Manager Approvals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Leave Balances Widget (Keka Style) */}
        <div className="card lg:col-span-5 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900">Leave Balances</span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">Annual</span>
            </div>
            <Link to="/leave" className="text-xs font-bold text-brand hover:text-brand-dark">
              Apply →
            </Link>
          </div>

          {leaveBalances && leaveBalances.length > 0 ? (
            <div className="space-y-3">
              {leaveBalances.slice(0, 4).map((balance) => {
                const quota = balance.leave_type?.annual_quota || 1;
                const pct = Math.min(100, Math.round((balance.closing / quota) * 100));
                return (
                  <div key={balance.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{balance.leave_type?.name ?? "Leave"}</p>
                        <p className="text-[10px] text-slate-500">Quota: {quota} days / year</p>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-extrabold text-brand font-mono leading-none">
                          {balance.closing}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-400 mt-0.5">Available</div>
                      </div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-brand transition-all duration-300" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No leave quotas allocated yet.</p>
          )}
        </div>

        {/* Manager/HR Approvals or Team Attendance */}
        <div className="card lg:col-span-7 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-bold text-sm text-slate-900">
                {isManager ? "Pending Approvals Queue" : "Leave History"}
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">Awaiting action or status changes</p>
            </div>
            {isManager ? (
              <Link to="/approvals" className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors">
                View Queue
              </Link>
            ) : null}
          </div>

          {pendingLeaves === 0 ? (
            <div className="py-6">
              <EmptyState
                title="All caught up"
                description="No pending requests needing your attention right now."
              />
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {(leaveRequests ?? [])
                .filter((r) => r.status === "pending")
                .slice(0, 3)
                .map((request) => (
                  <div key={request.id} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        name={request.employee?.full_name ?? "?"}
                        size="sm"
                        src={request.employee?.profile_picture_url}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {request.employee?.full_name ?? "Employee"}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {request.leave_type?.name} · {request.total_days} day(s) ({request.from_date} to {request.to_date})
                        </p>
                      </div>
                    </div>
                    <LeaveStatusBadge status={request.status} />
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Attendance Log Table */}
      {attendanceLoading ? (
        <Spinner label="Loading attendance logs…" />
      ) : (
        attendance &&
        attendance.length > 0 && (
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-slate-50/50">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Recent Attendance Logs</h2>
                <p className="text-[11px] text-slate-500">Punches logged for the last 7 working days</p>
              </div>
              <Link to="/attendance" className="text-xs font-bold text-brand hover:text-brand-dark">
                View Full Calendar →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Work Date</th>
                    <th className="py-3 px-4">First In</th>
                    <th className="py-3 px-4">Last Out</th>
                    <th className="py-3 px-4">Worked Hours</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...attendance]
                    .sort((a, b) => b.work_date.localeCompare(a.work_date))
                    .slice(0, 7)
                    .map((day) => (
                      <tr key={day.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-800">{day.work_date}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{formatTime(day.first_in_utc)}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{formatTime(day.last_out_utc)}</td>
                        <td className="py-3 px-4 font-semibold text-slate-700">{formatMinutes(day.worked_minutes)}</td>
                        <td className="py-3 px-4">
                          <AttendanceBadge status={day.status} />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}

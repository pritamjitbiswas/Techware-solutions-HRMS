import { useMemo, useState } from "react";

import { useAuth } from "../auth/AuthContext";
import { PageHeader } from "../components/ui/PageHeader";
import { Spinner } from "../components/ui/States";
import {
  IconChart,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClipboard,
  IconDownload,
  IconRefresh,
  IconUser,
  IconX,
} from "../components/icons";
import {
  useAttendanceMatrix,
  useEmployees,
  useSyncGoogleSheet,
  useTeamAttendance,
} from "../hooks/useData";
import { ATTENDANCE_STATUS_META, formatMinutes, toIsoDate } from "../lib/utils";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function TeamAttendancePage() {
  const { role } = useAuth();
  const isAdmin = role === "ADMIN";
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [viewMode, setViewMode] = useState<"matrix" | "individual">("matrix");

  // Filter states for Matrix view
  const [searchTerm, setSearchTerm] = useState("");
  const [shiftFilter, setShiftFilter] = useState<string>("ALL");

  // Single member state
  const { data: employees } = useEmployees();
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined);
  const activeId = selectedId ?? employees?.[0]?.id;
  const { data: individualAttendance, isLoading: isIndividualLoading } = useTeamAttendance(activeId, year, month);

  // Matrix Query
  const { data: matrixData, isLoading: isMatrixLoading } = useAttendanceMatrix(year, month);
  const syncMutation = useSyncGoogleSheet();
  const [syncNotice, setSyncNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleSyncGoogleSheet = () => {
    setSyncNotice(null);
    syncMutation.mutate(undefined, {
      onSuccess: (res) => {
        setSyncNotice({ type: "success", message: `${res.message} at ${new Date().toLocaleTimeString()}` });
      },
      onError: (err) => {
        setSyncNotice({
          type: "error",
          message: `Sync failed: ${err instanceof Error ? err.message : "Could not connect to Google Sheet"}`,
        });
      },
    });
  };

  const moveMonth = (delta: number) => {
    const nextYear = month + delta < 0 ? year - 1 : month + delta > 11 ? year + 1 : year;
    const nextMonth = (month + delta + 12) % 12;
    setYear(nextYear);
    setMonth(nextMonth);
  };

  // Filtered rows for Matrix view
  const filteredMatrixRows = useMemo(() => {
    if (!matrixData?.rows) return [];
    return matrixData.rows.filter((row) => {
      const matchSearch =
        row.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.designation.toLowerCase().includes(searchTerm.toLowerCase());

      const matchShift = shiftFilter === "ALL" || row.shift_code === shiftFilter;
      return matchSearch && matchShift;
    });
  }, [matrixData?.rows, searchTerm, shiftFilter]);

  // Export exact Excel matrix to CSV
  const handleExportCSV = () => {
    if (!matrixData) return;
    const headers = ["S/No", "Emp.Name", "Act ID", "Designation", ...matrixData.headers.map((h) => h.label)];
    const csvRows = [headers.join(",")];

    for (const row of filteredMatrixRows) {
      const rowValues = [
        row.s_no,
        `"${row.full_name}"`,
        row.employee_code,
        `"${row.designation}"`,
        ...row.days.map((d) => d.code),
      ];
      csvRows.push(rowValues.join(","));
    }

    // Append Shift Legend section at bottom just like the user's Excel
    csvRows.push("");
    csvRows.push("Shifts,Timings,Start,End");
    csvRows.push("G,General Shift,9:30 AM,7:00 PM");
    csvRows.push("B,Afternoon Shift,3:00 PM,12:00 AM");
    csvRows.push("C,Night Shift,10:00 PM,7:00 AM");
    csvRows.push("WO,Week OFF,-,-");
    csvRows.push("HO,Holiday,-,-");
    csvRows.push("L,Planned Leave,-,-");

    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Attendance_Roster_${MONTHS[month]}_${year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Single member stats
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayCells = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const byDate = useMemo(
    () => new Map((individualAttendance ?? []).map((d) => [d.work_date, d])),
    [individualAttendance],
  );

  const summary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const day of individualAttendance ?? []) {
      counts.set(day.status, (counts.get(day.status) ?? 0) + 1);
    }
    return counts;
  }, [individualAttendance]);

  const summaryCards: [string, number, string][] = [
    ["Present", summary.get("present") ?? 0, "text-success"],
    ["Half day", summary.get("half_day") ?? 0, "text-accent"],
    ["Absent", summary.get("absent") ?? 0, "text-danger"],
    ["Leave", summary.get("on_leave") ?? 0, "text-info"],
  ];

  const getShiftBadge = (code: string) => {
    switch (code) {
      case "G":
        return "bg-info-light text-info border-info/50 font-extrabold hover:bg-info/20";
      case "B":
        return "bg-accent-light text-accent-dark border-accent/50 font-extrabold hover:bg-accent/20";
      case "C":
        return "bg-success-light text-success border-success/50 font-extrabold hover:bg-success/20";
      case "WO":
      case "HO":
      case "L":
        return "bg-danger-light text-danger border-danger/50 font-extrabold hover:bg-danger/20";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Team Attendance & Shift Roster"
          subtitle="Monthly attendance tracking matrix & rotational shift schedules."
        />

        {/* Month Selector & View Toggle */}
        <div className="flex items-center gap-3">
          <div className="card-flat inline-flex p-1 shadow-chunky-sm">
            <button
              type="button"
              onClick={() => setViewMode("matrix")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                viewMode === "matrix"
                  ? "bg-brand text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <IconChart width={14} height={14} /> Monthly Excel Matrix
            </button>
            <button
              type="button"
              onClick={() => setViewMode("individual")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                viewMode === "individual"
                  ? "bg-brand text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <IconUser width={14} height={14} /> Individual Member View
            </button>
          </div>

          <div className="card-flat flex items-center px-2 py-1 shadow-chunky-sm">
            <button type="button" className="p-1 text-slate-500 hover:text-slate-900" onClick={() => moveMonth(-1)}>
              <IconChevronLeft width={14} height={14} />
            </button>
            <span className="min-w-36 text-center font-display text-xs font-bold text-slate-800">
              {MONTHS[month]} {year}
            </span>
            <button type="button" className="p-1 text-slate-500 hover:text-slate-900" onClick={() => moveMonth(1)}>
              <IconChevronRight width={14} height={14} />
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: MONTHLY EXCEL MATRIX */}
      {viewMode === "matrix" && (
        <div className="space-y-4">
          {/* Action & Filter Toolbar */}
          <div className="card p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[300px]">
              <div className="relative min-w-[200px] flex-1 max-w-xs">
                <input
                  type="text"
                  placeholder="Search name or Act ID (e.g. Anand, ACT734)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input text-xs py-1.5"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <span>Filter Shift:</span>
                <select
                  value={shiftFilter}
                  onChange={(e) => setShiftFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="ALL">All Shifts</option>
                  <option value="G">Shift G (General 9:30 AM - 7:00 PM)</option>
                  <option value="B">Shift B (Afternoon 3:00 PM - 12:00 AM)</option>
                  <option value="C">Shift C (Night 10:00 PM - 7:00 AM)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={handleSyncGoogleSheet}
                    disabled={syncMutation.isPending}
                    className="rounded-lg bg-brand hover:bg-brand-dark text-white font-bold text-xs px-3.5 py-1.5 shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-60"
                  >
                    <IconRefresh width={14} height={14} className={syncMutation.isPending ? "animate-spin" : ""} />
                    {syncMutation.isPending ? "Syncing Sheet…" : "Sync from Google Sheet"}
                  </button>

                  <a
                    href="https://docs.google.com/spreadsheets/d/1N4wWf4Fk1x16ViGQzjMGiGgKUIBR-mpw/edit?gid=577875166#gid=577875166"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs px-3 py-1.5 shadow-xs flex items-center gap-1.5 transition-all"
                  >
                    <span>Open Google Sheet</span>
                    <span className="text-[10px]">↗</span>
                  </a>
                </>
              )}

              <button
                type="button"
                onClick={handleExportCSV}
                className="rounded-lg bg-success hover:brightness-95 text-white font-bold text-xs px-3.5 py-1.5 shadow-xs flex items-center gap-1.5 transition-all"
              >
                <IconDownload width={14} height={14} /> Export to Excel (.csv)
              </button>
            </div>
          </div>

          {syncNotice && (
            <div
              className={`rounded-xl border px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-xs ${
                syncNotice.type === "success"
                  ? "border-success/30 bg-success-light text-success"
                  : "border-danger/30 bg-danger-light text-danger"
              }`}
            >
              <span className="flex items-center gap-1.5">
                {syncNotice.type === "success" ? (
                  <IconCheck width={14} height={14} />
                ) : (
                  <IconX width={14} height={14} />
                )}
                {syncNotice.message}
              </span>
              <button onClick={() => setSyncNotice(null)} className="ml-3 hover:opacity-70">
                <IconX width={12} height={12} />
              </button>
            </div>
          )}

          {/* Matrix Table */}
          {isMatrixLoading ? (
            <Spinner label="Generating team attendance matrix…" />
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#0F172A] text-white text-[11px] sticky top-0 z-20 shadow-sm">
                    <tr>
                      <th className="p-2.5 font-bold border-r border-slate-700 text-center sticky left-0 z-30 bg-[#0F172A] w-12">
                        S/No
                      </th>
                      <th className="p-2.5 font-bold border-r border-slate-700 min-w-[150px] sticky left-12 z-30 bg-[#0F172A]">
                        Emp. Name
                      </th>
                      <th className="p-2.5 font-bold border-r border-slate-700 min-w-[85px] sticky left-[198px] z-30 bg-[#0F172A] text-center">
                        Act ID
                      </th>
                      {matrixData?.headers.map((h) => (
                        <th
                          key={h.day}
                          className={`p-2 font-bold text-center border-r border-slate-700 min-w-[80px] ${
                            h.is_weekend ? "bg-slate-800 text-cyan-300" : ""
                          }`}
                        >
                          <div>{h.weekday}</div>
                          <div className="text-[10px] font-normal opacity-85">
                            {String(h.day).padStart(2, "0")}/{MONTHS[month].slice(0, 3)}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {filteredMatrixRows.map((row) => (
                      <tr key={row.employee_id} className="hover:bg-brand-light/40 transition-colors group">
                        {/* Pinned Left Columns */}
                        <td className="p-2 text-center font-bold text-slate-500 border-r border-slate-200 sticky left-0 z-10 bg-white group-hover:bg-brand-light/40">
                          {row.s_no}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-sans sticky left-12 z-10 bg-white group-hover:bg-brand-light/40 truncate max-w-[150px]">
                          <div className="font-bold text-slate-900 truncate leading-tight">{row.full_name}</div>
                          <div className="text-[10px] text-slate-400 font-sans truncate">{row.designation}</div>
                        </td>
                        <td className="p-2 text-center font-bold text-slate-700 border-r border-slate-200 sticky left-[198px] z-10 bg-white group-hover:bg-brand-light/40">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] border border-slate-200">
                            {row.employee_code}
                          </span>
                        </td>

                        {/* Month Days Columns */}
                        {row.days.map((d) => (
                          <td
                            key={d.day}
                            className={`p-1 text-center border-r border-slate-200 ${
                              matrixData?.headers[d.day - 1]?.is_weekend ? "bg-slate-50/80" : ""
                            }`}
                          >
                            {d.code ? (
                              <span
                                title={`Day ${d.day}: ${d.status.toUpperCase()}`}
                                className={`inline-flex items-center justify-center w-8 h-7 rounded text-[11px] font-extrabold border transition-all cursor-default shadow-2xs ${getShiftBadge(
                                  d.code,
                                )}`}
                              >
                                {d.code}
                              </span>
                            ) : (
                              <span className="inline-block w-8 h-7 text-slate-300 font-mono text-[11px] select-none leading-7 text-center">
                                —
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Shifts & Timings Legend Card (Matches user Excel exactly) */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <IconClipboard width={14} height={14} /> Shifts & Timings Reference
              </h3>
              <span className="text-[11px] text-slate-400">Systems Integration Shift Policies</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
              <div className="p-3 rounded-xl border border-info/40 bg-info-light space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-info bg-info-light px-2 py-0.5 rounded border border-info/50">
                    G
                  </span>
                  <span className="text-[10px] font-bold text-info">General</span>
                </div>
                <div className="text-xs font-black text-slate-900 mt-1">9:30 AM – 7:00 PM</div>
                <p className="text-[10px] text-slate-500">Day General Operations</p>
              </div>

              <div className="p-3 rounded-xl border border-accent/40 bg-accent-light space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-accent-dark bg-accent-light px-2 py-0.5 rounded border border-accent/50">
                    B
                  </span>
                  <span className="text-[10px] font-bold text-accent-dark">Afternoon</span>
                </div>
                <div className="text-xs font-black text-slate-900 mt-1">3:00 PM – 12:00 PM</div>
                <p className="text-[10px] text-slate-500">Afternoon / Evening Shift</p>
              </div>

              <div className="p-3 rounded-xl border border-success/40 bg-success-light space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-success bg-success-light px-2 py-0.5 rounded border border-success/50">
                    C
                  </span>
                  <span className="text-[10px] font-bold text-success">Night</span>
                </div>
                <div className="text-xs font-black text-slate-900 mt-1">10:00 PM – 7:00 AM</div>
                <p className="text-[10px] text-slate-500">24/7 NOC Graveyard Shift</p>
              </div>

              <div className="p-3 rounded-xl border border-danger/40 bg-danger-light space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-danger bg-danger-light px-2 py-0.5 rounded border border-danger/50">
                    WO
                  </span>
                  <span className="text-[10px] font-bold text-danger">Weekend</span>
                </div>
                <div className="text-xs font-black text-slate-900 mt-1">Week OFF</div>
                <p className="text-[10px] text-slate-500">Scheduled Rest Days</p>
              </div>

              <div className="p-3 rounded-xl border border-danger/40 bg-danger-light space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-danger bg-danger-light px-2 py-0.5 rounded border border-danger/50">
                    HO
                  </span>
                  <span className="text-[10px] font-bold text-danger">Holiday</span>
                </div>
                <div className="text-xs font-black text-slate-900 mt-1">Holiday</div>
                <p className="text-[10px] text-slate-500">Gazetted / Public Holiday</p>
              </div>

              <div className="p-3 rounded-xl border border-danger/40 bg-danger-light space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-danger bg-danger-light px-2 py-0.5 rounded border border-danger/50">
                    L
                  </span>
                  <span className="text-[10px] font-bold text-danger">Leave</span>
                </div>
                <div className="text-xs font-black text-slate-900 mt-1">Planned Leave</div>
                <p className="text-[10px] text-slate-500">Approved PTO / Leave</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: INDIVIDUAL MEMBER DETAILED CALENDAR */}
      {viewMode === "individual" && (
        <div className="space-y-6">
          <div className="card flex flex-wrap items-center gap-4 p-4">
            <div className="min-w-64 flex-1">
              <label className="label" htmlFor="member">
                Select Team Member
              </label>
              <select
                id="member"
                className="input"
                value={activeId ?? ""}
                onChange={(event) =>
                  setSelectedId(event.target.value ? Number(event.target.value) : undefined)
                }
              >
                {(employees ?? []).map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name} · {employee.employee_code}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ATTENDANCE_STATUS_META).map(([key, meta]) => (
                <span key={key} className={`chip ${meta.className}`}>
                  <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                  {meta.label}
                </span>
              ))}
            </div>
          </div>

          {isIndividualLoading ? (
            <Spinner label="Loading individual attendance…" />
          ) : (
            <>
              <div className="card overflow-hidden p-4">
                <div className="mb-2 grid grid-cols-7 gap-1">
                  {WEEKDAYS.map((day) => (
                    <div
                      key={day}
                      className="text-center font-display text-xs font-semibold uppercase tracking-wide text-ink-light"
                    >
                      {day}
                    </div>
                  ))}
                </div>
                <div className="overflow-x-auto">
                  <div className="grid min-w-[42rem] grid-cols-7 gap-1">
                    {dayCells.map((day) => {
                      const date = new Date(year, month, day);
                      const iso = toIsoDate(year, month, day);
                      const record = byDate.get(iso);
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                      const meta = record
                        ? ATTENDANCE_STATUS_META[record.status]
                        : ATTENDANCE_STATUS_META.weekly_off;
                      return (
                        <div
                          key={day}
                          title={record ? meta.label : isWeekend ? "Weekly off" : "No record"}
                          className={`flex aspect-square flex-col items-center justify-center rounded-lg border-2 p-1 ${
                            isWeekend && !record
                              ? "border-dashed border-slate-200 bg-paper text-ink-soft/60"
                              : meta.className
                          }`}
                        >
                          <span className="font-display text-sm font-bold">{day}</span>
                          {record ? (
                            <span className="hidden text-[9px] font-semibold md:block">
                              {formatMinutes(record.worked_minutes)}
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {summaryCards.map(([label, value, color]) => (
                  <div key={label} className="card p-4 text-center">
                    <p className={`font-display text-3xl font-bold ${color}`}>{value}</p>
                    <p className="font-display text-xs font-semibold uppercase text-ink-light">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

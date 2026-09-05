import { useMemo, useState } from "react";

import { PageHeader, StatCard } from "../components/ui/PageHeader";
import { Spinner } from "../components/ui/States";
import { IconChart, IconClock, IconDownload, IconUsers } from "../components/icons";
import { useAttendanceSummary, useDepartments } from "../hooks/useData";
import { downloadFile, endpoints } from "../lib/api";
import { ATTENDANCE_STATUS_META, formatMinutes } from "../lib/utils";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function ReportsPage() {
  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [filterDept, setFilterDept] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const monthParam = `${year}-${String(month + 1).padStart(2, "0")}`;
  const { data: rows, isLoading } = useAttendanceSummary(monthParam, filterDept);
  const { data: departments } = useDepartments();

  const totals = useMemo(() => {
    const acc = { present: 0, absent: 0, workedMinutes: 0 };
    for (const row of rows ?? []) {
      acc.present += row.present;
      acc.absent += row.absent;
      acc.workedMinutes += row.worked_minutes;
    }
    return acc;
  }, [rows]);

  const exportXlsx = async () => {
    setExporting(true);
    try {
      const params = filterDept ? `&department=${filterDept}` : "";
      await downloadFile(
        `${endpoints.reports.attendanceSummary}?month=${monthParam}${params}&format=xlsx`,
        `attendance-summary-${monthParam}.xlsx`,
      );
    } finally {
      setExporting(false);
    }
  };

  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle={`Attendance summary · ${monthLabel}`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="input w-auto"
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
            >
              {MONTH_NAMES.map((name, index) => (
                <option key={name} value={index}>
                  {name}
                </option>
              ))}
            </select>
            <select
              className="input w-auto"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            >
              {[today.getFullYear() - 1, today.getFullYear()].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select
              className="input w-auto"
              value={filterDept ?? ""}
              onChange={(event) =>
                setFilterDept(event.target.value ? Number(event.target.value) : null)
              }
            >
              <option value="">All departments</option>
              {(departments ?? []).map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            <button type="button" className="btn-primary" onClick={exportXlsx} disabled={exporting}>
              <IconDownload width={16} height={16} /> {exporting ? "Exporting…" : "Export XLSX"}
            </button>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Employees"
          value={rows?.length ?? 0}
          tone="brand"
          icon={<IconUsers width={20} height={20} />}
        />
        <StatCard
          label="Present days"
          value={totals.present}
          tone="info"
          icon={<IconChart width={20} height={20} />}
        />
        <StatCard
          label="Absent days"
          value={totals.absent}
          tone="danger"
          icon={<IconChart width={20} height={20} />}
        />
        <StatCard
          label="Worked (total)"
          value={formatMinutes(totals.workedMinutes)}
          tone="accent"
          icon={<IconClock width={20} height={20} />}
        />
      </div>

      {isLoading ? (
        <Spinner label="Loading report data…" />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th className="text-center">Present</th>
                  <th className="text-center">Half day</th>
                  <th className="text-center">Absent</th>
                  <th className="text-center">Leave</th>
                  <th className="text-center">Holiday</th>
                  <th className="text-center">Worked</th>
                </tr>
              </thead>
              <tbody>
                {(rows ?? []).map((row) => (
                  <tr key={row.employee_id}>
                    <td>
                      <span className="block font-semibold">{row.full_name}</span>
                      <span className="block text-xs text-ink-light">{row.employee_code}</span>
                    </td>
                    <td className="text-ink-light">{row.department_name ?? "—"}</td>
                    <td className="text-center font-semibold text-success">{row.present}</td>
                    <td className="text-center text-accent">{row.half_day}</td>
                    <td className="text-center font-semibold text-danger">{row.absent}</td>
                    <td className="text-center text-info">{row.on_leave}</td>
                    <td className="text-center text-brand-dark">{row.holiday}</td>
                    <td className="text-center">{formatMinutes(row.worked_minutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {Object.entries(ATTENDANCE_STATUS_META).map(([key, meta]) => (
          <span key={key} className={`chip ${meta.className}`}>
            <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
        ))}
      </div>
    </div>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";

import { Avatar } from "../../components/ui/Avatar";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState, Spinner } from "../../components/ui/States";
import { IconKey, IconPlus, IconSearch } from "../../components/icons";
import { ResetPasswordModal } from "../../components/ResetPasswordModal";
import { useAdminResetPassword, useDepartments, useDesignations, useEmployees } from "../../hooks/useData";
import { EMPLOYMENT_STATUS_LABELS, EMPLOYMENT_TYPE_LABELS } from "../../lib/utils";
import type { EmploymentStatus } from "../../lib/types";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "on_notice", label: "On notice" },
  { value: "exited", label: "Exited" },
];

export function EmployeesPage() {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  // Admin Reset Password State
  const [targetEmployee, setTargetEmployee] = useState<{ id: number; name: string; code: string; email: string } | null>(null);
  const [newPassword, setNewPassword] = useState("ChangeMe123!");
  const [mustChange, setMustChange] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const resetMutation = useAdminResetPassword();

  const { data: employees, isLoading, isError } = useEmployees({
    department,
    status,
    q: search || null,
  });
  const { data: departments } = useDepartments();
  const { data: designations } = useDesignations();

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle="Manage employee records, roles and access."
        actions={
          <Link to="/employees/new" className="btn-primary">
            <IconPlus width={16} height={16} />
            Add employee
          </Link>
        }
      />

      {/* Filters */}
      <div className="card mb-6 flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-52 flex-1">
          <IconSearch
            width={16}
            height={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
          />
          <input
            type="search"
            className="input pl-9"
            placeholder="Search name, code or email…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select
          className="input w-auto"
          value={department ?? ""}
          onChange={(event) =>
            setDepartment(event.target.value ? Number(event.target.value) : null)
          }
        >
          <option value="">All departments</option>
          {(departments ?? []).map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
        <select
          className="input w-auto"
          value={status ?? ""}
          onChange={(event) => setStatus(event.target.value || null)}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <Spinner label="Loading employees…" />
      ) : isError ? (
        <EmptyState
          title="Could not load employees"
          description="Try again in a moment."
        />
      ) : employees && employees.length === 0 ? (
        <EmptyState
          title="No employees found"
          description="Try adjusting your filters, or add a new employee."
          action={
            <Link to="/employees/new" className="btn-primary">
              <IconPlus width={16} height={16} />
              Add employee
            </Link>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Employment</th>
                  <th>Status</th>
                  <th>Account</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(employees ?? []).map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      <Link
                        to={`/employees/${employee.id}`}
                        className="flex items-center gap-3"
                      >
                        <Avatar
                          name={employee.full_name}
                          src={employee.profile_picture_url}
                          size="sm"
                        />
                        <span>
                          <span className="block font-semibold hover:underline">
                            {employee.full_name}
                          </span>
                          <span className="block text-xs text-ink-light">
                            {employee.employee_code} · {employee.official_email}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td>
                      {departments?.find((d) => d.id === employee.department_id)?.name ?? "—"}
                    </td>
                    <td className="text-ink-light">
                      {designations?.find((d) => d.id === employee.designation_id)?.title ?? "—"}
                    </td>
                    <td>
                      {EMPLOYMENT_TYPE_LABELS[employee.employment_type]}
                    </td>
                    <td>
                      <span
                        className={`chip ${
                          employee.employment_status === "active"
                            ? "border-success bg-success-light text-success"
                            : employee.employment_status === "on_notice"
                              ? "border-accent bg-accent-light text-accent-dark"
                              : "border-danger bg-danger-light text-danger"
                        }`}
                      >
                        {EMPLOYMENT_STATUS_LABELS[employee.employment_status as EmploymentStatus]}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`chip ${
                          employee.is_active
                            ? "border-info bg-info-light text-info"
                            : "border-slate-200 bg-paper text-ink-light"
                        }`}
                      >
                        {employee.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setTargetEmployee({
                            id: employee.id,
                            name: employee.full_name,
                            code: employee.employee_code,
                            email: employee.official_email,
                          });
                          setNewPassword("ChangeMe123!");
                          setMustChange(false);
                          setResetSuccess(null);
                          setResetError(null);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-brand-light hover:bg-brand-100 text-brand border border-brand-100 transition-all cursor-pointer inline-flex items-center gap-1"
                      >
                        <IconKey width={14} height={14} />
                        Reset PW
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin Reset Password Modal */}
      {targetEmployee && (
        <ResetPasswordModal
          open={!!targetEmployee}
          onClose={() => setTargetEmployee(null)}
          employeeName={targetEmployee.name}
          employeeCode={targetEmployee.code}
          employeeEmail={targetEmployee.email}
          newPassword={newPassword}
          onNewPasswordChange={setNewPassword}
          mustChange={mustChange}
          onMustChangeChange={setMustChange}
          isSubmitting={resetMutation.isPending}
          successMessage={resetSuccess}
          errorMessage={resetError}
          onSubmit={() => {
            if (!targetEmployee || !newPassword) return;
            setResetError(null);
            setResetSuccess(null);
            resetMutation.mutate(
              {
                employeeId: targetEmployee.id,
                newPassword,
                mustChangePassword: mustChange,
              },
              {
                onSuccess: (res) => {
                  setResetSuccess(res.message || "Password updated successfully!");
                  setTimeout(() => {
                    setTargetEmployee(null);
                    setResetSuccess(null);
                  }, 1500);
                },
                onError: (err) => {
                  setResetError(err instanceof Error ? err.message : "Password reset failed");
                },
              }
            );
          }}
        />
      )}
    </div>
  );
}

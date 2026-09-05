import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState, ErrorBanner, Spinner } from "../../components/ui/States";
import { IconKey } from "../../components/icons";
import { ResetPasswordModal } from "../../components/ResetPasswordModal";
import { useAuth } from "../../auth/AuthContext";
import {
  useAdminResetPassword,
  useDepartments,
  useDesignations,
  useEmployee,
  useEmployeeFinance,
  useShifts,
  useUpdateEmployee,
} from "../../hooks/useData";
import {
  EMPLOYMENT_STATUS_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  ROLE_LABELS,
  WORK_LOCATION_LABELS,
  formatCurrency,
  formatDate,
} from "../../lib/utils";

type EditForm = Record<string, string | number | null>;

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const employeeId = id ? Number(id) : undefined;
  const { role } = useAuth();

  const { data: employee, isLoading, isError } = useEmployee(employeeId);
  const { data: departments } = useDepartments();
  const { data: designations } = useDesignations();
  const { data: shifts } = useShifts();
  const { data: finance } = useEmployeeFinance(employeeId);
  const updateMutation = useUpdateEmployee();
  const resetMutation = useAdminResetPassword();

  const [editOpen, setEditOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({});
  const [saving, setSaving] = useState(false);

  // Admin Reset Password State
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("ChangeMe123!");
  const [mustChange, setMustChange] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const canEdit = role === "HR" || role === "ADMIN";

  const openEdit = () => {
    if (!employee) return;
    setEditForm({
      full_name: employee.full_name,
      official_email: employee.official_email,
      date_of_joining: employee.date_of_joining,
      designation_id: employee.designation_id ?? "",
      department_id: employee.department_id ?? "",
      reporting_manager_id: employee.reporting_manager_id ?? "",
      employment_type: employee.employment_type,
      shift_id: employee.shift_id ?? "",
      work_location: employee.work_location,
      employment_status: employee.employment_status,
    });
    setEditOpen(true);
  };

  const saveEdit = () => {
    if (!employeeId) return;
    setSaving(true);
    setLocalError(null);
    const payload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(editForm)) {
      payload[key] =
        value === "" || value === null
          ? null
          : key.endsWith("_id")
            ? Number(value)
            : value;
    }
    updateMutation.mutate(
      { id: employeeId, payload },
      {
        onSuccess: () => {
          setSaving(false);
          setEditOpen(false);
        },
        onError: (error: unknown) => {
          setSaving(false);
          setLocalError(error instanceof Error ? error.message : "Update failed");
        },
      },
    );
  };

  const handleResetPassword = () => {
    if (!employeeId || !newPassword) return;
    setResetError(null);
    setResetSuccess(null);
    resetMutation.mutate(
      {
        employeeId,
        newPassword,
        mustChangePassword: mustChange,
      },
      {
        onSuccess: (res) => {
          setResetSuccess(res.message || "Password updated successfully!");
          setTimeout(() => {
            setResetModalOpen(false);
            setResetSuccess(null);
          }, 1600);
        },
        onError: (err) => {
          setResetError(err instanceof Error ? err.message : "Password reset failed");
        },
      }
    );
  };

  if (isLoading) return <Spinner label="Loading employee…" />;
  if (isError || !employee) {
    return (
      <EmptyState
        title="Employee not found"
        description="The employee record could not be loaded."
        action={<Link to="/employees" className="btn-secondary">Back to employees</Link>}
      />
    );
  }

  const deptName = departments?.find((d) => d.id === employee.department_id)?.name ?? "—";
  const desigName = designations?.find((d) => d.id === employee.designation_id)?.title ?? "—";
  const shiftName = shifts?.find((s) => s.id === employee.shift_id)?.name ?? "—";

  return (
    <div>
      <PageHeader
        title="Employee profile"
        subtitle={`${employee.employee_code} · ${employee.official_email}`}
        actions={
          <div className="flex items-center gap-2">
            {role === "ADMIN" && (
              <button
                type="button"
                className="btn-secondary flex items-center gap-1.5"
                onClick={() => {
                  setNewPassword("ChangeMe123!");
                  setMustChange(false);
                  setResetSuccess(null);
                  setResetError(null);
                  setResetModalOpen(true);
                }}
              >
                <IconKey width={14} height={14} />
                Reset Password
              </button>
            )}
            {canEdit ? (
              <button type="button" className="btn-primary" onClick={openEdit}>
                Edit details
              </button>
            ) : (
              <Link to="/employees" className="btn-secondary">
                Back to employees
              </Link>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - identity */}
        <div className="space-y-6">
          <div className="card flex flex-col items-center gap-3 p-6 text-center">
            <Avatar name={employee.full_name} src={employee.profile_picture_url} size="xl" />
            <div>
              <h2 className="font-display text-xl font-bold">{employee.full_name}</h2>
              <p className="text-sm text-ink-light">
                {desigName} · {deptName}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge className="border-slate-200 bg-paper text-ink-light">{ROLE_LABELS[employee.role]}</Badge>
              <Badge
                className={
                  employee.employment_status === "active"
                    ? "border-success bg-success-light text-success"
                    : "border-danger bg-danger-light text-danger"
                }
              >
                {EMPLOYMENT_STATUS_LABELS[employee.employment_status]}
              </Badge>
            </div>
            <div className="grid w-full grid-cols-2 gap-2 text-center">
              <div className="rounded-xl border border-slate-200 bg-paper p-3">
                <p className="font-display text-xs uppercase text-ink-light">Joining</p>
                <p className="font-display text-sm font-bold">{formatDate(employee.date_of_joining)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-paper p-3">
                <p className="font-display text-xs uppercase text-ink-light">Location</p>
                <p className="font-display text-sm font-bold">{WORK_LOCATION_LABELS[employee.work_location]}</p>
              </div>
              <div className="col-span-2 rounded-xl border border-slate-200 bg-paper p-3">
                <p className="font-display text-xs uppercase text-ink-light">Shift</p>
                <p className="font-display text-sm font-bold">{shiftName}</p>
              </div>
            </div>
          </div>

          {canEdit ? (
            <div className="card p-5">
              <h3 className="mb-3 font-display text-base font-bold">Personal details</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-light">Date of birth</dt>
                  <dd className="font-semibold">{formatDate(employee.date_of_birth)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-light">Mobile</dt>
                  <dd className="font-semibold">{employee.personal_mobile ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-light">Blood group</dt>
                  <dd className="font-semibold">{employee.blood_group ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-light">Employment</dt>
                  <dd className="font-semibold">{EMPLOYMENT_TYPE_LABELS[employee.employment_type]}</dd>
                </div>
              </dl>
            </div>
          ) : null}
        </div>

        {/* Right column - admin info */}
        <div className="space-y-6 lg:col-span-2">
          {canEdit ? (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h3 className="font-display text-base font-bold">Finance (confidential)</h3>
              </div>
              {finance ? (
                <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3">
                  <div>
                    <p className="font-display text-xs uppercase text-ink-light">Annual CTC</p>
                    <p className="font-display text-lg font-bold">{formatCurrency(finance.ctc_annual)}</p>
                  </div>
                  <div>
                    <p className="font-display text-xs uppercase text-ink-light">PAN</p>
                    <p className="font-semibold">{finance.pan_number ?? "—"}</p>
                  </div>
                  <div>
                    <p className="font-display text-xs uppercase text-ink-light">PF UAN</p>
                    <p className="font-semibold">{finance.pf_uan ?? "—"}</p>
                  </div>
                  <div>
                    <p className="font-display text-xs uppercase text-ink-light">Bank</p>
                    <p className="font-semibold">{finance.bank_name ?? "—"}</p>
                  </div>
                  <div>
                    <p className="font-display text-xs uppercase text-ink-light">Account no.</p>
                    <p className="font-semibold">{finance.bank_account_number ?? "—"}</p>
                  </div>
                  <div>
                    <p className="font-display text-xs uppercase text-ink-light">IFSC</p>
                    <p className="font-semibold">{finance.bank_ifsc ?? "—"}</p>
                  </div>
                </div>
              ) : (
                <p className="p-5 text-sm text-ink-light">No finance record on file.</p>
              )}
            </div>
          ) : null}

          <div className="card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-display text-base font-bold">Job & organisation</h3>
            </div>
            <dl className="grid gap-x-8 gap-y-4 p-5 sm:grid-cols-2">
              {[
                ["Department", deptName],
                ["Designation", desigName],
                ["Reporting manager", employee.reporting_manager_id ? `#${employee.reporting_manager_id}` : "—"],
                ["Employment type", EMPLOYMENT_TYPE_LABELS[employee.employment_type]],
                ["Work location", WORK_LOCATION_LABELS[employee.work_location]],
                ["Shift", shiftName],
                ["Status", EMPLOYMENT_STATUS_LABELS[employee.employment_status]],
                ["Date of exit", formatDate(employee.date_of_exit)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-ink-light">{label}</dt>
                  <dd className="text-right font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-display text-base font-bold">Contact & emergency</h3>
            </div>
            <dl className="grid gap-x-8 gap-y-4 p-5 sm:grid-cols-2">
              {[
                ["Personal email", employee.personal_email ?? "—"],
                ["Personal mobile", employee.personal_mobile ?? "—"],
                ["Current address", employee.current_address ?? "—"],
                ["Permanent address", employee.permanent_address ?? "—"],
                ["Emergency contact", employee.emergency_contact_name ?? "—"],
                ["Emergency number", employee.emergency_contact_number ?? "—"],
                ["Relation", employee.emergency_contact_relation ?? "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-ink-light">{label}</dt>
                  <dd className="text-right font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit employee details" wide>
        {localError ? <ErrorBanner message={localError} onRetry={() => setLocalError(null)} /> : null}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Full name</label>
            <input
              className="input"
              value={(editForm.full_name as string) ?? ""}
              onChange={(event) => setEditForm({ ...editForm, full_name: event.target.value })}
            />
          </div>
          <div>
            <label className="label">Official email</label>
            <input
              className="input"
              value={(editForm.official_email as string) ?? ""}
              onChange={(event) => setEditForm({ ...editForm, official_email: event.target.value })}
            />
          </div>
          <div>
            <label className="label">Date of joining</label>
            <input
              type="date"
              className="input"
              value={(editForm.date_of_joining as string) ?? ""}
              onChange={(event) => setEditForm({ ...editForm, date_of_joining: event.target.value })}
            />
          </div>
          <div>
            <label className="label">Designation</label>
            <select
              className="input"
              value={(editForm.designation_id as number) ?? ""}
              onChange={(event) => setEditForm({ ...editForm, designation_id: event.target.value })}
            >
              <option value="">None</option>
              {(designations ?? []).map((d) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Department</label>
            <select
              className="input"
              value={(editForm.department_id as number) ?? ""}
              onChange={(event) => setEditForm({ ...editForm, department_id: event.target.value })}
            >
              <option value="">None</option>
              {(departments ?? []).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Shift</label>
            <select
              className="input"
              value={(editForm.shift_id as number) ?? ""}
              onChange={(event) => setEditForm({ ...editForm, shift_id: event.target.value })}
            >
              <option value="">None</option>
              {(shifts ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Employment type</label>
            <select
              className="input"
              value={(editForm.employment_type as string) ?? "full_time"}
              onChange={(event) => setEditForm({ ...editForm, employment_type: event.target.value })}
            >
              <option value="full_time">Full-time</option>
              <option value="part_time">Part-time</option>
              <option value="intern">Intern</option>
              <option value="contract">Contract</option>
            </select>
          </div>
          <div>
            <label className="label">Work location</label>
            <select
              className="input"
              value={(editForm.work_location as string) ?? "office"}
              onChange={(event) => setEditForm({ ...editForm, work_location: event.target.value })}
            >
              <option value="office">Office</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          <div>
            <label className="label">Employment status</label>
            <select
              className="input"
              value={(editForm.employment_status as string) ?? "active"}
              onChange={(event) => setEditForm({ ...editForm, employment_status: event.target.value })}
            >
              <option value="active">Active</option>
              <option value="on_notice">On notice</option>
              <option value="exited">Exited</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => setEditOpen(false)}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={saveEdit} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </Modal>

      {/* Admin Reset Password Modal */}
      <ResetPasswordModal
        open={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        employeeName={employee.full_name}
        employeeCode={employee.employee_code}
        employeeEmail={employee.official_email}
        newPassword={newPassword}
        onNewPasswordChange={setNewPassword}
        mustChange={mustChange}
        onMustChangeChange={setMustChange}
        isSubmitting={resetMutation.isPending}
        successMessage={resetSuccess}
        errorMessage={resetError}
        onSubmit={handleResetPassword}
      />
    </div>
  );
}

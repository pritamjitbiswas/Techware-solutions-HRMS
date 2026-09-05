import { useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { ErrorBanner } from "../../components/ui/States";
import { IconCheck } from "../../components/icons";
import {
  useCreateEmployee,
  useDepartments,
  useDesignations,
  useEmployees,
  useShifts,
} from "../../hooks/useData";
import { ROLE_LABELS } from "../../lib/utils";

const STEPS = ["Basic info", "Job details", "Finance (optional)", "Account & role"];

const ROLE_OPTIONS = ["EMPLOYEE", "MANAGER", "HR", "ADMIN"] as const;
const EMPLOYMENT_TYPES = ["full_time", "part_time", "intern", "contract"] as const;
const WORK_LOCATIONS = ["office", "remote", "hybrid"] as const;

interface WizardForm {
  full_name: string;
  official_email: string;
  date_of_joining: string;
  designation_id: string;
  department_id: string;
  reporting_manager_id: string;
  employment_type: string;
  shift_id: string;
  work_location: string;
  ctc_annual: string;
  pan_number: string;
  bank_account_number: string;
  bank_ifsc: string;
  bank_name: string;
  role: string;
}

const INITIAL_FORM: WizardForm = {
  full_name: "",
  official_email: "",
  date_of_joining: "",
  designation_id: "",
  department_id: "",
  reporting_manager_id: "",
  employment_type: "full_time",
  shift_id: "",
  work_location: "office",
  ctc_annual: "",
  pan_number: "",
  bank_account_number: "",
  bank_ifsc: "",
  bank_name: "",
  role: "EMPLOYEE",
};

export function CreateEmployeeWizard() {
  const navigate = useNavigate();
  const createMutation = useCreateEmployee();

  const { data: departments } = useDepartments();
  const { data: designations } = useDesignations();
  const { data: shifts } = useShifts();
  const { data: employees } = useEmployees();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardForm>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ name: string; password: string } | null>(null);

  const set = <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validateStep = (): string | null => {
    if (step === 0) {
      if (!form.full_name.trim()) return "Full name is required.";
      if (!form.official_email.trim()) return "Official email is required.";
      if (!form.date_of_joining) return "Date of joining is required.";
    }
    if (step === 1) {
      if (!form.department_id) return "Please select a department.";
      if (!form.designation_id) return "Please select a designation.";
      if (!form.shift_id) return "Please select a shift.";
    }
    return null;
  };

  const next = () => {
    const validation = validateStep();
    if (validation) {
      setError(validation);
      return;
    }
    setError(null);
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const back = () => {
    setError(null);
    setStep((current) => Math.max(current - 1, 0));
  };

  const submit = () => {
    setError(null);
    if (step < STEPS.length - 1) {
      next();
      return;
    }
    const payload: Record<string, unknown> = {
      full_name: form.full_name.trim(),
      official_email: form.official_email.trim(),
      date_of_joining: form.date_of_joining,
      designation_id: form.designation_id ? Number(form.designation_id) : null,
      department_id: form.department_id ? Number(form.department_id) : null,
      reporting_manager_id: form.reporting_manager_id
        ? Number(form.reporting_manager_id)
        : null,
      employment_type: form.employment_type,
      shift_id: form.shift_id ? Number(form.shift_id) : null,
      work_location: form.work_location,
      role: form.role,
      finance:
        form.ctc_annual || form.pan_number || form.bank_account_number || form.bank_ifsc || form.bank_name
          ? {
              ctc_annual: form.ctc_annual || null,
              pan_number: form.pan_number || null,
              bank_account_number: form.bank_account_number || null,
              bank_ifsc: form.bank_ifsc || null,
              bank_name: form.bank_name || null,
            }
          : null,
    };
    createMutation.mutate(payload, {
      onSuccess: (result) => {
        setCreated({ name: result.employee.full_name, password: result.temporary_password });
      },
      onError: (mutError: unknown) => {
        setError(mutError instanceof Error ? mutError.message : "Could not create employee");
      },
    });
  };

  const stepTitles: Record<number, { title: string; subtitle: string }> = {
    0: { title: "Basic information", subtitle: "Who is joining?" },
    1: { title: "Job details", subtitle: "Department, designation and shift." },
    2: { title: "Finance (optional)", subtitle: "CTC and bank details — HR/Admin only." },
    3: { title: "Account & role", subtitle: "Provision the login and assign a role." },
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Add employee"
        subtitle={stepTitles[step].subtitle}
        actions={
          <Link to="/employees" className="btn-secondary">
            Cancel
          </Link>
        }
      />

      {/* Stepper */}
      <ol className="mb-6 grid grid-cols-4 gap-2">
        {STEPS.map((label, index) => {
          const done = index < step;
          const active = index === step;
          return (
            <li key={label} className="text-center">
              <div
                className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 font-display text-sm font-bold ${
                  done ? "bg-success text-white" : active ? "bg-accent" : "bg-white text-ink-light"
                }`}
              >
                {done ? <IconCheck width={16} height={16} /> : index + 1}
              </div>
              <p
                className={`mt-2 hidden text-xs font-semibold sm:block ${
                  active ? "text-ink" : "text-ink-light"
                }`}
              >
                {label}
              </p>
            </li>
          );
        })}
      </ol>

      <div className="card p-6">
        {error ? (
          <div className="mb-4">
            <ErrorBanner message={error} onRetry={() => setError(null)} />
          </div>
        ) : null}

        {step === 0 ? (
          <div className="space-y-4">
            <Field label="Full name" hint="Legal name as per records">
              <input
                className="input"
                placeholder="e.g. Aditi Sharma"
                value={form.full_name}
                onChange={(event) => set("full_name", event.target.value)}
              />
            </Field>
            <Field label="Official email" hint="Used as the login identity">
              <input
                type="email"
                className="input"
                placeholder="aditi@company.local"
                value={form.official_email}
                onChange={(event) => set("official_email", event.target.value)}
              />
            </Field>
            <Field label="Date of joining">
              <input
                type="date"
                className="input"
                value={form.date_of_joining}
                onChange={(event) => set("date_of_joining", event.target.value)}
              />
            </Field>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Department">
                <select
                  className="input"
                  value={form.department_id}
                  onChange={(event) => set("department_id", event.target.value)}
                >
                  <option value="">Select department…</option>
                  {(departments ?? []).map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Designation">
                <select
                  className="input"
                  value={form.designation_id}
                  onChange={(event) => set("designation_id", event.target.value)}
                >
                  <option value="">Select designation…</option>
                  {(designations ?? []).map((d) => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
              </Field>
              <Field label="Shift">
                <select
                  className="input"
                  value={form.shift_id}
                  onChange={(event) => set("shift_id", event.target.value)}
                >
                  <option value="">Select shift…</option>
                  {(shifts ?? []).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Reporting manager">
                <select
                  className="input"
                  value={form.reporting_manager_id}
                  onChange={(event) => set("reporting_manager_id", event.target.value)}
                >
                  <option value="">No manager</option>
                  {(employees ?? [])
                    .filter((e) => e.role === "MANAGER" || e.role === "HR" || e.role === "ADMIN")
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.full_name} ({e.employee_code})
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Employment type">
                <select
                  className="input"
                  value={form.employment_type}
                  onChange={(event) => set("employment_type", event.target.value)}
                >
                  {EMPLOYMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Work location">
                <select
                  className="input"
                  value={form.work_location}
                  onChange={(event) => set("work_location", event.target.value)}
                >
                  {WORK_LOCATIONS.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <p className="rounded-xl border-2 border-accent bg-accent-light px-4 py-3 text-sm font-semibold text-accent-dark">
              Confidential. Only HR and Admin can view or edit these fields.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Annual CTC (₹)">
                <input
                  type="number"
                  className="input"
                  placeholder="1200000"
                  value={form.ctc_annual}
                  onChange={(event) => set("ctc_annual", event.target.value)}
                />
              </Field>
              <Field label="PAN number">
                <input
                  className="input"
                  placeholder="ABCDE1234F"
                  value={form.pan_number}
                  onChange={(event) => set("pan_number", event.target.value.toUpperCase())}
                />
              </Field>
              <Field label="Bank name">
                <input
                  className="input"
                  placeholder="HDFC Bank"
                  value={form.bank_name}
                  onChange={(event) => set("bank_name", event.target.value)}
                />
              </Field>
              <Field label="Bank account number">
                <input
                  className="input"
                  placeholder="Account number"
                  value={form.bank_account_number}
                  onChange={(event) => set("bank_account_number", event.target.value)}
                />
              </Field>
              <Field label="IFSC code">
                <input
                  className="input"
                  placeholder="HDFC0001234"
                  value={form.bank_ifsc}
                  onChange={(event) => set("bank_ifsc", event.target.value.toUpperCase())}
                />
              </Field>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <Field label="Role" hint="Determines what this person can see and do">
              <select
                className="input"
                value={form.role}
                onChange={(event) => set("role", event.target.value)}
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                ))}
              </select>
            </Field>
            <div className="rounded-xl border border-slate-200 bg-paper p-4 text-sm">
              <p className="font-display font-bold">What happens next?</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-ink-light">
                <li>An employee code is generated automatically (e.g. ACT-0008).</li>
                <li>A temporary password is generated and shown once below.</li>
                <li>The new hire must change it on first login.</li>
              </ul>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex justify-between">
          <button type="button" className="btn-secondary" onClick={back} disabled={step === 0}>
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn-primary" onClick={next}>
              Continue
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              onClick={submit}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating…" : "Create employee"}
            </button>
          )}
        </div>
      </div>

      <Modal
        open={created !== null}
        onClose={() => navigate("/employees")}
        title="Employee created"
      >
        {created ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-success text-white">
              <IconCheck width={24} height={24} />
            </div>
            <p className="font-display text-lg font-bold">{created.name} is ready to go.</p>
            <div className="rounded-xl border border-slate-200 bg-paper p-4">
              <p className="font-display text-xs font-semibold uppercase text-ink-light">
                Temporary password (shown once)
              </p>
              <p className="mt-1 font-display text-xl font-bold tracking-wide">{created.password}</p>
              <p className="mt-2 text-xs text-ink-light">
                Share it securely. The employee must change it on first login.
              </p>
            </div>
            <button type="button" className="btn-primary w-full" onClick={() => navigate("/employees")}>
              Done
            </button>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

function Field({ label, hint, children }: FieldProps) {
  return (
    <div>
      <label className="label">{label}</label>
      {hint ? <p className="-mt-1 mb-1.5 text-xs text-ink-soft">{hint}</p> : null}
      {children}
    </div>
  );
}

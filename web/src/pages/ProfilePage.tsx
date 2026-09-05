import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import type { FormEvent } from "react";

import { useAuth } from "../auth/AuthContext";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { PageHeader } from "../components/ui/PageHeader";
import { ErrorBanner } from "../components/ui/States";
import { IconCheck, IconKey, IconX } from "../components/icons";
import { api, endpoints } from "../lib/api";
import { useUploadProfilePicture } from "../hooks/useData";
import { ROLE_LABELS, formatDate } from "../lib/utils";

type ProfileForm = {
  date_of_birth: string;
  personal_mobile: string;
  personal_email: string;
  current_address: string;
  permanent_address: string;
  emergency_contact_name: string;
  emergency_contact_number: string;
  emergency_contact_relation: string;
  blood_group: string;
};

type ProfileUpdatePayload = {
  [K in keyof ProfileForm]: string | null;
};

const EMPTY_FORM: ProfileForm = {
  date_of_birth: "",
  personal_mobile: "",
  personal_email: "",
  current_address: "",
  permanent_address: "",
  emergency_contact_name: "",
  emergency_contact_number: "",
  emergency_contact_relation: "",
  blood_group: "",
};

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const uploadMutation = useUploadProfilePicture();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [formReady, setFormReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: (payload: ProfileUpdatePayload) =>
      api.patch<unknown>(endpoints.me.root, payload),
    onSuccess: async () => {
      await refreshUser();
      setSaving(false);
      setSaved(true);
      setFormReady(false);
    },
    onError: (mutError: unknown) => {
      setSaving(false);
      setError(mutError instanceof Error ? mutError.message : "Update failed");
    },
  });

  const prepareForm = () => {
    if (!user) return;
    setForm({
      date_of_birth: user.date_of_birth ?? "",
      personal_mobile: user.personal_mobile ?? "",
      personal_email: user.personal_email ?? "",
      current_address: user.current_address ?? "",
      permanent_address: user.permanent_address ?? "",
      emergency_contact_name: user.emergency_contact_name ?? "",
      emergency_contact_number: user.emergency_contact_number ?? "",
      emergency_contact_relation: user.emergency_contact_relation ?? "",
      blood_group: user.blood_group ?? "",
    });
    setError(null);
    setSaved(false);
    setFormReady(true);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    updateMutation.mutate({
      ...form,
      date_of_birth: form.date_of_birth || null,
      personal_mobile: form.personal_mobile.trim() || null,
      personal_email: form.personal_email.trim() || null,
      current_address: form.current_address.trim() || null,
      permanent_address: form.permanent_address.trim() || null,
      emergency_contact_name: form.emergency_contact_name.trim() || null,
      emergency_contact_number: form.emergency_contact_number.trim() || null,
      emergency_contact_relation: form.emergency_contact_relation.trim() || null,
      blood_group: form.blood_group.trim() || null,
    });
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    uploadMutation.mutate(file, {
      onSuccess: async () => {
        await refreshUser();
      },
      onError: (mutError: unknown) => {
        setError(mutError instanceof Error ? mutError.message : "Upload failed");
      },
    });
  };

  if (!user) return null;

  const readOnlyRows: [string, string][] = [
    ["Employee code", user.employee_code],
    ["Official email", user.official_email],
    ["Department", `#${user.department_id ?? "—"}`],
    ["Designation", `#${user.designation_id ?? "—"}`],
    ["Date of joining", formatDate(user.date_of_joining)],
  ];

  return (
    <div>
      <PageHeader
        title="My profile"
        subtitle="Your details. Some fields are managed by HR and cannot be edited here."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left - identity card */}
        <div className="space-y-6">
          <div className="card flex flex-col items-center gap-4 p-6 text-center">
            <div className="relative">
              <Avatar name={user.full_name} src={user.profile_picture_url} size="xl" />
              <button
                type="button"
                className="absolute -bottom-1 -right-1 rounded-full border border-slate-200 bg-accent px-2.5 py-1 font-display text-xs font-bold shadow-chunky-sm hover:brightness-95"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? "…" : "Edit"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold">{user.full_name}</h2>
              <p className="text-sm text-ink-light">{user.official_email}</p>
            </div>
            <Badge className="border-slate-200 bg-paper text-ink-light">{ROLE_LABELS[user.role]}</Badge>
            <p className="text-xs text-ink-soft">
              JPEG, PNG or WebP · max 5 MB
            </p>
          </div>

          <div className="card p-5">
            <h3 className="mb-3 font-display text-base font-bold">Work info (read-only)</h3>
            <dl className="space-y-2 text-sm">
              {readOnlyRows.map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-ink-light">{label}</dt>
                  <dd className="font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 rounded-xl border-2 border-accent bg-accent-light px-3 py-2 text-xs font-semibold text-accent-dark">
              Designation, department, shift and code are set by HR.
            </p>
          </div>
        </div>

        {/* Right - self-service form */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-display text-base font-bold">Personal & emergency details</h3>
              {!formReady ? (
                <button type="button" className="btn-secondary btn-sm" onClick={prepareForm}>
                  Edit
                </button>
              ) : null}
            </div>

            {saved ? (
              <div className="mb-5 rounded-xl border-2 border-success bg-success-light px-4 py-3 text-sm font-semibold text-ink">
                Profile updated successfully.
              </div>
            ) : null}
            {error ? (
              <div className="mb-5">
                <ErrorBanner message={error} onRetry={() => setError(null)} />
              </div>
            ) : null}

            {!formReady ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ["Date of birth", formatDate(user.date_of_birth)],
                  ["Personal mobile", user.personal_mobile ?? "—"],
                  ["Personal email", user.personal_email ?? "—"],
                  ["Blood group", user.blood_group ?? "—"],
                  ["Emergency contact", user.emergency_contact_name ?? "—"],
                  ["Emergency number", user.emergency_contact_number ?? "—"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-slate-200 bg-paper p-3">
                    <p className="font-display text-xs uppercase text-ink-light">{label}</p>
                    <p className="mt-0.5 font-semibold">{value}</p>
                  </div>
                ))}
                <div className="col-span-2 rounded-xl border border-slate-200 bg-paper p-3">
                  <p className="font-display text-xs uppercase text-ink-light">Current address</p>
                  <p className="mt-0.5 font-semibold">{user.current_address ?? "—"}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
                <Field label="Date of birth">
                  <input
                    type="date"
                    className="input"
                    value={form.date_of_birth}
                    onChange={(event) => setForm({ ...form, date_of_birth: event.target.value })}
                  />
                </Field>
                <Field label="Blood group">
                  <select
                    className="input"
                    value={form.blood_group}
                    onChange={(event) => setForm({ ...form, blood_group: event.target.value })}
                  >
                    <option value="">Select…</option>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((group) => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Personal mobile">
                  <input
                    className="input"
                    placeholder="+91 98XXXXXXXX"
                    value={form.personal_mobile}
                    onChange={(event) => setForm({ ...form, personal_mobile: event.target.value })}
                  />
                </Field>
                <Field label="Personal email">
                  <input
                    type="email"
                    className="input"
                    placeholder="you@gmail.com"
                    value={form.personal_email}
                    onChange={(event) => setForm({ ...form, personal_email: event.target.value })}
                  />
                </Field>
                <div className="col-span-2">
                  <Field label="Current address">
                    <textarea
                      className="input min-h-20 resize-y"
                      value={form.current_address}
                      onChange={(event) => setForm({ ...form, current_address: event.target.value })}
                    />
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label="Permanent address">
                    <textarea
                      className="input min-h-20 resize-y"
                      placeholder="Leave empty if same as current"
                      value={form.permanent_address}
                      onChange={(event) => setForm({ ...form, permanent_address: event.target.value })}
                    />
                  </Field>
                </div>
                <Field label="Emergency contact name">
                  <input
                    className="input"
                    value={form.emergency_contact_name}
                    onChange={(event) =>
                      setForm({ ...form, emergency_contact_name: event.target.value })
                    }
                  />
                </Field>
                <Field label="Emergency contact number">
                  <input
                    className="input"
                    value={form.emergency_contact_number}
                    onChange={(event) =>
                      setForm({ ...form, emergency_contact_number: event.target.value })
                    }
                  />
                </Field>
                <Field label="Relation">
                  <input
                    className="input"
                    placeholder="Spouse, parent…"
                    value={form.emergency_contact_relation}
                    onChange={(event) =>
                      setForm({ ...form, emergency_contact_relation: event.target.value })
                    }
                  />
                </Field>

                <div className="col-span-2 mt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setFormReady(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Change Password Card */}
        <ChangePasswordCard />
      </div>
    </div>
  );
}

function ChangePasswordCard() {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-6 mt-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-light text-brand border border-brand-100">
          <IconKey width={16} height={16} />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">Security & Change Password</h2>
          <p className="text-xs text-slate-500">Update your login password to keep your account secure</p>
        </div>
      </div>

      {success && (
        <div className="mb-4 rounded-lg bg-success-light border border-success/30 p-3 text-xs font-semibold text-success flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <IconCheck width={14} height={14} />
            Your password has been successfully updated!
          </span>
          <button type="button" onClick={() => setSuccess(false)} className="hover:opacity-70">
            <IconX width={12} height={12} />
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-danger-light border border-danger/30 p-3 text-xs font-semibold text-danger flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="hover:opacity-70">
            <IconX width={12} height={12} />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="label">Current Password</label>
          <input
            type="password"
            required
            className="input"
            placeholder="••••••••"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="label">New Password</label>
          <input
            type="password"
            required
            className="input"
            placeholder="At least 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Confirm New Password</label>
          <input
            type="password"
            required
            className="input"
            placeholder="Repeat new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <div className="md:col-span-3 flex justify-end pt-2">
          <button type="submit" disabled={loading} className="btn-primary cursor-pointer">
            {loading ? "Updating Password…" : "Update Password"}
          </button>
        </div>
      </form>
    </div>
  );
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

function Field({ label, children }: FieldProps) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

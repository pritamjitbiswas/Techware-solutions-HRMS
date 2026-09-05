import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/AuthContext";
import { IconPunch } from "../../components/icons";

export function ChangePasswordPage() {
  const { changePassword, logout } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: ({ current, next }: { current: string; next: string }) =>
      changePassword(current, next),
    onSuccess: () => {
      navigate("/");
    },
    onError: (error: unknown) => {
      setLocalError(error instanceof Error ? error.message : "Could not change password");
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    if (newPassword.length < 8) {
      setLocalError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError("New passwords do not match.");
      return;
    }
    mutation.mutate({ current: currentPassword, next: newPassword });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
            <IconPunch width={32} height={32} />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Set a new password</h1>
          <p className="mt-1 text-sm text-ink-light">
            You must change your temporary password before continuing.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <div>
            <label htmlFor="currentPassword" className="label">
              Current password
            </label>
            <input
              id="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              className="input"
              placeholder="Temporary password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="label">
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              required
              autoComplete="new-password"
              className="input"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="label">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              className="input"
              placeholder="Repeat new password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>

          {localError ? (
            <p className="rounded-xl border-2 border-danger bg-danger-light px-4 py-3 text-sm font-semibold text-ink">
              {localError}
            </p>
          ) : null}
          {mutation.isError && !localError ? (
            <p className="rounded-xl border-2 border-danger bg-danger-light px-4 py-3 text-sm font-semibold text-ink">
              {mutation.error instanceof Error ? mutation.error.message : "Update failed"}
            </p>
          ) : null}

          <button type="submit" disabled={mutation.isPending} className="btn-primary w-full">
            {mutation.isPending ? "Updating…" : "Update password"}
          </button>

          <button
            type="button"
            className="btn-ghost w-full justify-center text-sm"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Sign out instead
          </button>
        </form>
      </div>
    </div>
  );
}

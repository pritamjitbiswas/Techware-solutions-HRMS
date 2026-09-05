import { Modal } from "./ui/Modal";
import { IconCheck, IconX } from "./icons";

interface ResetPasswordModalProps {
  open: boolean;
  onClose: () => void;
  employeeName: string;
  employeeCode: string;
  employeeEmail: string;
  newPassword: string;
  onNewPasswordChange: (value: string) => void;
  mustChange: boolean;
  onMustChangeChange: (value: boolean) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  successMessage: string | null;
  errorMessage: string | null;
}

export function ResetPasswordModal({
  open,
  onClose,
  employeeName,
  employeeCode,
  employeeEmail,
  newPassword,
  onNewPasswordChange,
  mustChange,
  onMustChangeChange,
  onSubmit,
  isSubmitting,
  successMessage,
  errorMessage,
}: ResetPasswordModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={`Reset Password · ${employeeName}`}>
      <div className="space-y-4">
        <p className="text-xs text-ink-light">
          Set a new login password for {employeeCode} ({employeeEmail}).
        </p>
        {successMessage && (
          <div className="flex items-center gap-1.5 rounded-lg border border-success/30 bg-success-light p-3 text-xs font-semibold text-success">
            <IconCheck width={14} height={14} />
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-1.5 rounded-lg border border-danger/30 bg-danger-light p-3 text-xs font-semibold text-danger">
            <IconX width={14} height={14} />
            {errorMessage}
          </div>
        )}

        <div>
          <label className="label">New Password</label>
          <div className="flex gap-2">
            <input
              type="text"
              required
              className="input font-mono text-sm flex-1"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => onNewPasswordChange(e.target.value)}
            />
            <button
              type="button"
              onClick={() => onNewPasswordChange("ChangeMe123!")}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
              title="Reset to default password"
            >
              Default
            </button>
          </div>
          <p className="text-[11px] text-ink-soft mt-1">Must be at least 6 characters long.</p>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="resetPasswordMustChange"
            checked={mustChange}
            onChange={(e) => onMustChangeChange(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
          />
          <label htmlFor="resetPasswordMustChange" className="text-xs text-ink-light select-none cursor-pointer">
            Require user to change password on their next login
          </label>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn-primary cursor-pointer"
          onClick={onSubmit}
          disabled={isSubmitting || !newPassword}
        >
          {isSubmitting ? "Updating Password…" : "Update Password"}
        </button>
      </div>
    </Modal>
  );
}

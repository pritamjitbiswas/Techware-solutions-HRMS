import { useState } from "react";
import type { FormEvent } from "react";

import { LeaveStatusBadge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState, Spinner } from "../components/ui/States";
import { IconPlus } from "../components/icons";
import { useApplyLeave, useLeaveBalance, useLeaveRequests, useLeaveTypes } from "../hooks/useData";
import { formatDate, formatDateTime } from "../lib/utils";

export function LeavePage() {
  const { data: balances, isLoading: balancesLoading } = useLeaveBalance();
  const { data: requests, isLoading: requestsLoading } = useLeaveRequests();
  const { data: leaveTypes } = useLeaveTypes();
  const applyMutation = useApplyLeave();

  const [applyOpen, setApplyOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [form, setForm] = useState({
    leaveTypeId: "",
    fromDate: "",
    toDate: "",
    reason: "",
  });

  const handleApply = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!form.leaveTypeId || !form.fromDate || !form.toDate || !form.reason) {
      setFormError("Please fill in all fields.");
      return;
    }
    if (new Date(form.toDate) < new Date(form.fromDate)) {
      setFormError("End date cannot be before the start date.");
      return;
    }
    applyMutation.mutate(
      {
        leave_type_id: Number(form.leaveTypeId),
        from_date: form.fromDate,
        to_date: form.toDate,
        is_half_day: false,
        reason: form.reason,
      },
      {
        onSuccess: () => {
          setApplyOpen(false);
          setForm({ leaveTypeId: "", fromDate: "", toDate: "", reason: "" });
        },
        onError: (error) => {
          setFormError(error instanceof Error ? error.message : "Could not submit request");
        },
      },
    );
  };

  const grouped = {
    pending: (requests ?? []).filter((r) => r.status === "pending"),
    decided: (requests ?? []).filter((r) => r.status !== "pending"),
  };

  return (
    <div>
      <PageHeader
        title="Leave"
        subtitle="Check your balance, apply for leave, and track requests."
        actions={
          <button type="button" className="btn-primary" onClick={() => setApplyOpen(true)}>
            <IconPlus width={16} height={16} />
            Apply for leave
          </button>
        }
      />

      {balancesLoading ? (
        <Spinner label="Loading balances…" />
      ) : (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(balances ?? []).map((balance) => (
            <div key={balance.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-xs font-semibold uppercase tracking-wide text-ink-light">
                    {balance.leave_type?.name}
                  </p>
                  <p className="mt-2 font-display text-4xl font-bold leading-none">
                    {balance.closing}
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">days available</p>
                </div>
                <span className="chip border-slate-200 bg-paper text-ink-light">
                  {balance.leave_type?.code}
                </span>
              </div>
              <div className="mt-4 flex justify-between text-xs text-ink-light">
                <span>Used {balance.used}</span>
                <span>Pending {balance.pending}</span>
                <span>Quota {balance.leave_type?.annual_quota}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {requestsLoading ? (
        <Spinner label="Loading requests…" />
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 font-display text-lg font-bold">Pending requests</h2>
            {grouped.pending.length === 0 ? (
              <EmptyState
                title="Nothing pending"
                description="You have no leave requests waiting for a decision."
              />
            ) : (
              <div className="card divide-y divide-ink/10 overflow-hidden">
                {grouped.pending.map((request) => (
                  <div key={request.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {request.leave_type?.name ?? "Leave"}
                        <span className="ml-2 text-sm font-normal text-ink-light">
                          {formatDate(request.from_date)} → {formatDate(request.to_date)}
                        </span>
                      </p>
                      <p className="mt-0.5 text-sm text-ink-light">{request.reason}</p>
                    </div>
                    <div className="text-right">
                      <LeaveStatusBadge status={request.status} />
                      <p className="mt-1 text-xs text-ink-soft">
                        Applied {formatDate(request.applied_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 font-display text-lg font-bold">History</h2>
            {grouped.decided.length === 0 ? (
              <EmptyState title="No history yet" description="Decided leave requests will appear here." />
            ) : (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Dates</th>
                        <th>Days</th>
                        <th>Status</th>
                        <th>Decision</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grouped.decided.map((request) => (
                        <tr key={request.id}>
                          <td className="font-semibold">{request.leave_type?.name ?? "Leave"}</td>
                          <td>
                            {formatDate(request.from_date)} → {formatDate(request.to_date)}
                          </td>
                          <td>{request.total_days}</td>
                          <td><LeaveStatusBadge status={request.status} /></td>
                          <td className="text-sm text-ink-light">
                            {request.actioned_at ? formatDateTime(request.actioned_at) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      <Modal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        title="Apply for leave"
      >
        <form onSubmit={handleApply} className="space-y-4">
          <div>
            <label htmlFor="leaveTypeId" className="label">Leave type</label>
            <select
              id="leaveTypeId"
              className="input"
              value={form.leaveTypeId}
              onChange={(event) => setForm({ ...form, leaveTypeId: event.target.value })}
            >
              <option value="">Select a leave type…</option>
              {(leaveTypes ?? []).map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} ({type.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="fromDate" className="label">From</label>
              <input
                id="fromDate"
                type="date"
                className="input"
                value={form.fromDate}
                onChange={(event) => setForm({ ...form, fromDate: event.target.value })}
              />
            </div>
            <div>
              <label htmlFor="toDate" className="label">To</label>
              <input
                id="toDate"
                type="date"
                className="input"
                value={form.toDate}
                onChange={(event) => setForm({ ...form, toDate: event.target.value })}
              />
            </div>
          </div>

          <div>
            <label htmlFor="reason" className="label">Reason</label>
            <textarea
              id="reason"
              className="input min-h-24 resize-y"
              placeholder="Tell your manager why you need this leave"
              value={form.reason}
              onChange={(event) => setForm({ ...form, reason: event.target.value })}
            />
          </div>

          {formError ? (
            <p className="rounded-xl border-2 border-danger bg-danger-light px-4 py-3 text-sm font-semibold text-ink">
              {formError}
            </p>
          ) : null}

          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setApplyOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={applyMutation.isPending}>
              {applyMutation.isPending ? "Submitting…" : "Submit request"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

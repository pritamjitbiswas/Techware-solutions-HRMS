import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Avatar } from "../components/ui/Avatar";
import { Modal } from "../components/ui/Modal";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState, ErrorBanner, Spinner } from "../components/ui/States";
import { IconCheck, IconX } from "../components/icons";
import { api, endpoints } from "../lib/api";
import type { Regularisation } from "../lib/demo";
import { useLeaveRequests, useRegularisations } from "../hooks/useData";
import type { LeaveRequest } from "../lib/types";
import { formatDate } from "../lib/utils";

type Tab = "leave" | "regularisation";
type DecisionTarget =
  | { kind: "leave"; request: LeaveRequest }
  | { kind: "regularisation"; request: Regularisation };

export function ApprovalsPage() {
  const [tab, setTab] = useState<Tab>("leave");
  const [deciding, setDeciding] = useState<DecisionTarget | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: leaves, isLoading: leavesLoading } = useLeaveRequests("pending");
  const { data: regularisations, isLoading: regLoading } = useRegularisations("pending");

  const actionMutation = useMutation({
    mutationFn: async ({
      type,
      id,
      approve,
    }: {
      type: Tab;
      id: number;
      approve: boolean;
    }) => {
      // Best effort: hit real API, fall back to a local demo flow.
      try {
        if (type === "leave") {
          const path = approve ? endpoints.leave.approve(id) : endpoints.leave.reject(id);
          return await api.post(path, { comment: comment || undefined });
        }
        const path = approve
          ? endpoints.regularisations.approve(id)
          : endpoints.regularisations.reject(id);
        return await api.post(path, { comment: comment || undefined });
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return undefined;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["regularisations"] });
      setDeciding(null);
      setComment("");
      setError(null);
    },
  });

  const decide = (approve: boolean) => {
    if (!deciding) return;
    setError(null);
    actionMutation.mutate(
      { type: deciding.kind === "leave" ? "leave" : "regularisation", id: deciding.request.id, approve },
      {
        onError: (mutError: unknown) => {
          setError(mutError instanceof Error ? mutError.message : "Action failed");
        },
      },
    );
  };

  const employeeNameFor = (
    request: LeaveRequest | Regularisation,
  ): string => request.employee?.full_name ?? "Employee";

  return (
    <div>
      <PageHeader
        title="Approvals"
        subtitle="Review and act on leave and attendance regularisation requests."
      />

      <div className="mb-6 inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-chunky-sm">
        {(
          [
            ["leave", "Leave requests"],
            ["regularisation", "Regularisations"],
          ] as [Tab, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-lg px-4 py-2 font-display text-sm font-bold ${
              tab === value ? "bg-brand text-white" : "text-ink-light hover:bg-paper"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mb-4">
          <ErrorBanner message={error} onRetry={() => setError(null)} />
        </div>
      ) : null}

      {tab === "leave" ? (
        leavesLoading ? (
          <Spinner label="Loading leave requests…" />
        ) : leaves && leaves.length === 0 ? (
          <EmptyState
            title="No pending leave requests"
            description="New requests from your team will appear here."
          />
        ) : (
          <div className="card divide-y divide-ink/10 overflow-hidden">
            {(leaves ?? []).map((request) => (
              <div key={request.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <Avatar
                  name={employeeNameFor(request)}
                  src={request.employee?.profile_picture_url}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {employeeNameFor(request)}
                    <span className="ml-2 text-sm font-normal text-ink-light">
                      {request.leave_type?.name}
                    </span>
                  </p>
                  <p className="mt-0.5 text-sm text-ink-light">
                    {formatDate(request.from_date)} → {formatDate(request.to_date)} ·{" "}
                    {request.total_days} day{request.total_days > 1 ? "s" : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">{request.reason}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setDeciding({ kind: "leave", request })}
                  >
                    <IconCheck width={14} height={14} /> Approve
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => setDeciding({ kind: "leave", request })}
                  >
                    <IconX width={14} height={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : regLoading ? (
        <Spinner label="Loading regularisations…" />
      ) : regularisations && regularisations.length === 0 ? (
        <EmptyState
          title="No pending regularisations"
          description="Regularisation requests from your team will appear here."
        />
      ) : (
        <div className="card divide-y divide-ink/10 overflow-hidden">
          {(regularisations ?? []).map((request) => (
            <div key={request.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <Avatar name={employeeNameFor(request)} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{employeeNameFor(request)}</p>
                <p className="mt-0.5 text-sm text-ink-light">
                  {formatDate(request.work_date)}
                  {request.requested_in_time ? ` · In ${request.requested_in_time}` : ""}
                  {request.requested_out_time ? ` · Out ${request.requested_out_time}` : ""}
                </p>
                <p className="mt-0.5 text-xs text-ink-soft">{request.reason}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setDeciding({ kind: "regularisation", request })}
                >
                  <IconCheck width={14} height={14} /> Approve
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => setDeciding({ kind: "regularisation", request })}
                >
                  <IconX width={14} height={14} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={deciding !== null}
        onClose={() => setDeciding(null)}
        title="Decision"
      >
        {deciding ? (
          <div className="space-y-4">
            <p className="text-sm text-ink-light">
              You are about to action a {deciding.kind === "leave" ? "leave" : "regularisation"}{" "}
              request from{" "}
              <span className="font-bold text-ink">{employeeNameFor(deciding.request)}</span>.
            </p>
            <div>
              <label className="label" htmlFor="comment">
                Comment (optional)
              </label>
              <textarea
                id="comment"
                className="input min-h-20 resize-y"
                placeholder="Add a note for the employee…"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setDeciding(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => decide(false)}
                disabled={actionMutation.isPending}
              >
                <IconX width={14} height={14} /> Reject
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => decide(true)}
                disabled={actionMutation.isPending}
              >
                <IconCheck width={14} height={14} /> Approve
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

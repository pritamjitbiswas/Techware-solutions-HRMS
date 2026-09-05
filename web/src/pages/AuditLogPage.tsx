import { useState } from "react";

import { PageHeader } from "../components/ui/PageHeader";
import { Badge } from "../components/ui/Badge";
import { EmptyState, Spinner } from "../components/ui/States";
import { IconCheck, IconX, IconSearch } from "../components/icons";
import { useAuditLog } from "../hooks/useData";
import { formatDateTime } from "../lib/utils";

const ACTION_TONES: Record<string, string> = {
  create: "border-success bg-success-light text-success",
  update: "border-info bg-info-light text-info",
  override: "border-accent bg-accent-light text-accent-dark",
  approve: "border-slate-200 bg-paper text-ink-light",
  reject: "border-danger bg-danger-light text-danger",
  rejected: "border-danger bg-danger-light text-danger",
  role_change: "border-slate-200 bg-paper text-ink-light",
};

export function AuditLogPage() {
  const { data: logs, isLoading } = useAuditLog();
  const [query, setQuery] = useState("");

  const filtered = (logs ?? []).filter((log) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      log.entity_type.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      (log.ip_address ?? "").toLowerCase().includes(q) ||
      String(log.entity_id).includes(q)
    );
  });

  return (
    <div>
      <PageHeader
        title="Audit log"
        subtitle="Every sensitive write, recorded with before/after values."
      />

      <div className="card mb-6 flex items-center gap-3 p-4">
        <div className="relative max-w-md flex-1">
          <IconSearch
            width={16}
            height={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
          />
          <input
            type="search"
            className="input pl-9"
            placeholder="Filter by entity, action or IP…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <Spinner label="Loading audit log…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No audit entries"
          description="Sensitive changes are recorded here as they happen."
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Actor</th>
                  <th>Entity</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap text-ink-light">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="font-semibold">User #{log.actor_user_id ?? "system"}</td>
                    <td>
                      <span className="font-display text-xs font-bold uppercase text-ink-light">
                        {log.entity_type}
                      </span>
                      <span className="ml-1 text-xs text-ink-soft">#{log.entity_id}</span>
                    </td>
                    <td>
                      <Badge className={ACTION_TONES[log.action] ?? "border-slate-200 bg-paper"}>
                        {log.action}
                      </Badge>
                    </td>
                    <td>
                      {log.before_json ? (
                        <span className="flex items-center gap-1 text-xs text-danger">
                          <IconX width={12} height={12} /> {diffSummary(log.before_json)}
                        </span>
                      ) : null}
                      {log.after_json ? (
                        <span className="flex items-center gap-1 text-xs text-success">
                          <IconCheck width={12} height={12} /> {diffSummary(log.after_json)}
                        </span>
                      ) : null}
                    </td>
                    <td className="text-xs text-ink-light">{log.ip_address ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function diffSummary(json: Record<string, unknown>): string {
  const entries = Object.entries(json);
  if (entries.length === 0) return "—";
  return entries
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${String(value ?? "null")}`)
    .join(", ");
}

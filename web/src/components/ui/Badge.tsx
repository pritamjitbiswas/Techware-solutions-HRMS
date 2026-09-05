import type { ReactNode } from "react";

import type { AttendanceStatusName } from "../../lib/types";
import { ATTENDANCE_STATUS_META, LEAVE_STATUS_META } from "../../lib/utils";

interface BadgeProps {
  children: ReactNode;
  className?: string;
}

export function Badge({ children, className = "" }: BadgeProps) {
  return <span className={`badge-status ${className}`}>{children}</span>;
}

export function AttendanceBadge({ status }: { status: AttendanceStatusName }) {
  const meta = ATTENDANCE_STATUS_META[status];
  return <Badge className={meta.className}>{meta.label}</Badge>;
}

interface LeaveStatusBadgeProps {
  status: "pending" | "approved" | "rejected" | "cancelled";
}

export function LeaveStatusBadge({ status }: LeaveStatusBadgeProps) {
  const meta = LEAVE_STATUS_META[status];
  return <Badge className={meta.className}>{meta.label}</Badge>;
}

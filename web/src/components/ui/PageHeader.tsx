import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-500 font-medium">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "brand" | "accent" | "danger" | "info";
  icon?: ReactNode;
}

const TONES = {
  brand: "bg-indigo-50/80 text-indigo-600 border-indigo-100 ring-4 ring-indigo-50/50",
  accent: "bg-amber-50/80 text-amber-600 border-amber-100 ring-4 ring-amber-50/50",
  danger: "bg-rose-50/80 text-rose-600 border-rose-100 ring-4 ring-rose-50/50",
  info: "bg-sky-50/80 text-sky-600 border-sky-100 ring-4 ring-sky-50/50",
};

export function StatCard({ label, value, sub, tone = "brand", icon }: StatCardProps) {
  return (
    <div className="card flex items-center gap-4 p-5 hover:border-slate-300 hover:shadow-chunky transition-all duration-200">
      {icon ? (
        <div className={`${TONES[tone]} flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-transform hover:scale-105`}>
          {icon}
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="font-display text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className="font-display text-2xl font-extrabold leading-tight text-ink mt-0.5">{value}</p>
        {sub ? <p className="text-xs text-slate-500 font-medium mt-0.5">{sub}</p> : null}
      </div>
    </div>
  );
}

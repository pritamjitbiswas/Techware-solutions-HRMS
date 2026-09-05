import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/AuthContext";
import { ApiError } from "../../lib/api";

export function LoginPage() {
  const { login, clearLoginError, loginError } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: ({ e, p }: { e: string; p: string }) => login(e, p),
    onSuccess: (tokens) => {
      if (tokens.must_change_password) {
        navigate("/change-password");
      } else {
        navigate("/");
      }
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        clearLoginError();
        const message = error.message;
        void message;
      }
    },
  });

  const normalizeEmail = (input: string): string => {
    const raw = input.trim();
    if (!raw) return "";
    if (raw.includes("@")) return raw;
    const lower = raw.toLowerCase();
    if (lower === "admin") return "admin@company.local";
    if (lower === "pritamjit" || lower === "pritam") return "pritamjit.biswas@company.local";
    if (lower === "anand") return "anand.singh@company.local";
    if (lower === "sundar") return "sundar.singh@company.local";
    if (lower === "pratul") return "pratul.patel@company.local";
    return `${raw}@company.local`;
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const resolvedEmail = normalizeEmail(email);
    mutation.mutate({ e: resolvedEmail, p: password });
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Hero Pane (Systems Integration Theme) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-7/12 relative bg-brand-gradient text-white p-12 flex-col justify-between overflow-hidden">
        {/* Ambient glow decorative accents */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-orange-500/15 blur-3xl pointer-events-none" />

        {/* Top Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-brand font-bold text-xl shadow-lg">
            T
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-2xl tracking-tight">Techware</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400 bg-orange-400/20 px-2 py-0.5 rounded border border-orange-400/30">
                SYSTEMS INTEGRATION
              </span>
            </div>
            <p className="text-xs text-purple-200/80 font-medium">Enterprise IT & Network Operations</p>
          </div>
        </div>

        {/* Middle Feature Highlights tailored for SI */}
        <div className="relative z-10 max-w-lg space-y-6 my-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-purple-200 backdrop-blur-sm border border-white/15">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            NOC, SOC & Field Operations Ready
          </div>
          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight">
            Workforce operations for Network Engineers & System Admins.
          </h1>
          <p className="text-sm xl:text-base text-purple-200/90 leading-relaxed">
            Engineered for high-uptime environments. Track rotational 24/7 NOC shifts, field client site visits, SLA-aligned on-call rosters, and seamless leave approvals.
          </p>

          <div className="space-y-3 pt-2 text-sm text-purple-100">
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">⚡</span>
              <span>24/7 rotational NOC & Data Center shifts with cross-midnight attribution</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">🛰️</span>
              <span>Client-site & Data Center geofenced Web Clock-In for Field Engineers</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">🛡️</span>
              <span>Incident regularisation workflows & multi-tier manager approvals</span>
            </div>
          </div>
        </div>

        {/* Bottom Stat Footer */}
        <div className="relative z-10 border-t border-white/15 pt-6 flex items-center justify-between text-xs text-purple-200">
          <span>Techware Systems Integration HRMS · High-Availability Portal</span>
          <span className="font-mono text-[11px] opacity-80">Build v2.5.0</span>
        </div>
      </div>

      {/* Right Login Pane */}
      <div className="w-full lg:w-1/2 xl:w-5/12 flex flex-col justify-between p-6 sm:p-12 overflow-y-auto bg-white">
        <div className="max-w-md w-full mx-auto my-auto space-y-7">
          {/* Mobile-only Logo */}
          <div className="flex lg:hidden items-center gap-2 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white font-bold text-lg">
              T
            </div>
            <div>
              <span className="font-bold text-xl text-ink">Techware</span>
              <span className="ml-1.5 text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
                SYSTEMS INTEGRATION
              </span>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-ink tracking-tight">Login to Techware SI</h2>
            <p className="text-xs text-ink-light mt-1">
              Sign in with your Network Engineer, SysAdmin, or Manager credentials
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="email" className="block text-xs font-semibold text-ink">
                  Email or Username
                </label>
              </div>
              <input
                id="email"
                type="text"
                required
                autoComplete="username"
                className="input"
                placeholder="Official email or username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-semibold text-ink">
                  Password
                </label>
              </div>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {loginError ? (
              <div className="rounded-lg border border-danger/30 bg-danger-light p-3 text-xs font-medium text-danger">
                {loginError}
              </div>
            ) : null}
            {mutation.isError && !loginError ? (
              <div className="rounded-lg border border-danger/30 bg-danger-light p-3 text-xs font-medium text-danger">
                {mutation.error instanceof Error ? mutation.error.message : "Sign in failed"}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary w-full cursor-pointer"
            >
              {mutation.isPending ? "Authenticating…" : "Access Operations Portal →"}
            </button>
          </form>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-200 space-y-2 text-xs text-ink-light">
            <p className="text-[11px] text-ink-soft leading-tight">
              Techware Solution · Systems Integration & Infrastructure Operations HRMS Platform.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import type { ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/AuthContext";
import { ROLE_LABELS } from "../../lib/utils";
import type { Role } from "../../lib/types";
import { Avatar } from "../ui/Avatar";
import {
  IconBriefcase,
  IconCalendar,
  IconChart,
  IconClock,
  IconHome,
  IconKey,
  IconLogout,
  IconSettings,
  IconShield,
  IconUsers,
  IconX,
} from "../icons";

interface NavGroup {
  title: string;
  items: {
    to: string;
    label: string;
    icon: typeof IconHome;
    roles: Role[];
  }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "ME",
    items: [
      { to: "/", label: "Home", icon: IconHome, roles: ["EMPLOYEE", "MANAGER", "HR", "ADMIN"] },
      { to: "/attendance", label: "Attendance", icon: IconClock, roles: ["EMPLOYEE", "MANAGER", "HR", "ADMIN"] },
      { to: "/leave", label: "Leave", icon: IconCalendar, roles: ["EMPLOYEE", "MANAGER", "HR", "ADMIN"] },
      { to: "/profile", label: "Profile", icon: IconBriefcase, roles: ["EMPLOYEE", "MANAGER", "HR", "ADMIN"] },
    ],
  },
  {
    title: "MY TEAM",
    items: [
      { to: "/team", label: "Team Attendance", icon: IconUsers, roles: ["ADMIN"] },
      { to: "/approvals", label: "Approvals", icon: IconShield, roles: ["ADMIN"] },
    ],
  },
  {
    title: "ORGANIZATION",
    items: [
      { to: "/employees", label: "Employees", icon: IconUsers, roles: ["ADMIN"] },
      { to: "/reports", label: "Analytics & Reports", icon: IconChart, roles: ["ADMIN"] },
      { to: "/settings", label: "Settings", icon: IconSettings, roles: ["ADMIN"] },
    ],
  },
  {
    title: "ADMINISTRATION",
    items: [
      { to: "/audit", label: "Audit Log", icon: IconShield, roles: ["ADMIN"] },
    ],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getRoleBadge = (r?: Role | null) => {
    switch (r) {
      case "ADMIN":
        return "bg-rose-500/20 text-rose-300 border-rose-500/30";
      case "HR":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      case "MANAGER":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      default:
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#0F172A] text-slate-300">
      {/* Brand Header */}
      <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-4.5 bg-[#0A0F1D]">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-brand to-brand-600 font-display text-base font-bold text-white shadow-md shadow-brand/30">
          T
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-display text-base font-bold text-white tracking-tight">Techware</span>
            <span className="rounded bg-orange-500/20 px-1 py-0.2 text-[9px] font-bold text-orange-400 border border-orange-500/30 uppercase">
              HRMS
            </span>
          </div>
          <p className="text-[11px] text-slate-400 truncate">Systems Integration</p>
        </div>
      </div>

      {/* Nav Categories */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 text-xs">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) => role && item.roles.includes(role));
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.title} className="space-y-1">
              <div className="px-3 pb-1 font-display text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                {group.title}
              </div>
              {visibleItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-brand text-white shadow-sm font-bold"
                        : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
                    }`
                  }
                >
                  <item.icon width={16} height={16} className="shrink-0 opacity-85 transition-transform group-hover:scale-110" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* User Card at bottom */}
      <div className="border-t border-slate-800 p-3 bg-[#0A0F1D]/80">
        <div className="flex items-center gap-3 rounded-lg p-2 bg-slate-800/40 border border-slate-800 mb-2">
          <Avatar name={user?.full_name ?? "?"} src={user?.profile_picture_url} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-white leading-tight">{user?.full_name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className={`inline-block rounded px-1.5 py-0.2 text-[9px] font-bold border ${getRoleBadge(role)}`}>
                {role ? ROLE_LABELS[role] : ""}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">{user?.employee_code}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/profile"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 hover:text-white py-2 text-xs font-medium text-slate-400 transition-colors border border-slate-700/50"
          >
            <IconKey width={14} height={14} />
            Password
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 hover:text-rose-400 py-2 text-xs font-medium text-slate-400 transition-colors border border-slate-700/50 cursor-pointer"
          >
            <IconLogout width={14} height={14} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, role } = useAuth();

  return (
    <div className="min-h-screen bg-paper font-sans antialiased text-slate-800">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-slate-800 bg-[#0F172A] shadow-[4px_0_24px_-4px_rgba(0,0,0,0.35)] lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-slate-800 bg-[#0F172A]">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3.5 top-4 rounded-lg bg-slate-800 p-1.5 text-slate-400 hover:text-white"
              aria-label="Close menu"
            >
              <IconX width={16} height={16} />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      {/* Main Container */}
      <div className="lg:pl-60">
        {/* Keka Top Header */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 shadow-[0_2px_8px_-2px_rgba(15,24,36,0.08)]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-100 lg:hidden cursor-pointer flex items-center justify-center"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Mobile Header Logo */}
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white font-bold text-xs">
                T
              </div>
              <span className="font-bold text-sm text-slate-900 tracking-tight">Techware</span>
            </div>

            {/* Keka Universal Search bar */}
            <div className="relative hidden md:block w-72">
              <input
                type="text"
                placeholder="Search employees, actions... (Ctrl+K)"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand-100"
              />
              <svg className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 text-xs">
            {/* Quick Actions */}
            <Link
              to="/leave"
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-brand bg-brand-light border border-brand-100 hover:bg-brand-100 transition-colors"
            >
              <span>+</span> Apply Leave
            </Link>

            {/* Time / Location pill */}
            <div className="hidden lg:flex items-center gap-1.5 text-slate-500 bg-slate-100/80 px-2.5 py-1 rounded-md border border-slate-200/60 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Kolkata, IN (IST)</span>
            </div>

            {/* Profile pill */}
            <Link to="/profile" className="flex items-center gap-2 pl-2 border-l border-slate-200 hover:opacity-85 transition-opacity">
              <Avatar name={user?.full_name ?? "?"} src={user?.profile_picture_url} size="sm" />
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-800 leading-tight">{user?.full_name?.split(" ")[0]}</p>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">{role ? ROLE_LABELS[role] : ""}</p>
              </div>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 max-w-7xl mx-auto pb-24 lg:pb-8">{children}</main>

        {/* Mobile Phone Bottom Navigation Bar */}
        <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-30 flex items-center justify-around py-2 px-2 lg:hidden shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-bold transition-all ${
                isActive ? "text-brand" : "text-slate-500 hover:text-slate-800"
              }`
            }
          >
            <IconHome width={20} height={20} />
            <span className="mt-1">Home</span>
          </NavLink>

          <NavLink
            to="/attendance"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-bold transition-all ${
                isActive ? "text-brand" : "text-slate-500 hover:text-slate-800"
              }`
            }
          >
            <IconClock width={20} height={20} />
            <span className="mt-1">Clock</span>
          </NavLink>

          <NavLink
            to="/leave"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-bold transition-all ${
                isActive ? "text-brand" : "text-slate-500 hover:text-slate-800"
              }`
            }
          >
            <IconCalendar width={20} height={20} />
            <span className="mt-1">Leave</span>
          </NavLink>

          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-bold transition-all ${
                isActive ? "text-brand" : "text-slate-500 hover:text-slate-800"
              }`
            }
          >
            <Avatar name={user?.full_name ?? "?"} src={user?.profile_picture_url} size="sm" />
            <span className="mt-1">Profile</span>
          </NavLink>
        </nav>
      </div>
    </div>
  );
}

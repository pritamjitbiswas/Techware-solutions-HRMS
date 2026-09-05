import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider, useAuth } from "./auth/AuthContext";
import { AppShell } from "./components/layout/AppShell";
import { Spinner } from "./components/ui/States";
import { appStorage } from "./lib/storage";
import type { Role } from "./lib/types";

import { ChangePasswordPage } from "./pages/auth/ChangePasswordPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { AttendancePage } from "./pages/AttendancePage";
import { ApprovalsPage } from "./pages/ApprovalsPage";
import { AuditLogPage } from "./pages/AuditLogPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CreateEmployeeWizard } from "./pages/employees/CreateEmployeeWizard";
import { EmployeeDetailPage } from "./pages/employees/EmployeeDetailPage";
import { EmployeesPage } from "./pages/employees/EmployeesPage";
import { LeavePage } from "./pages/LeavePage";
import { ProfilePage } from "./pages/ProfilePage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TeamAttendancePage } from "./pages/TeamAttendancePage";

function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { isAuthenticated, isInitializing, role } = useAuth();

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (appStorage.getMustChangePassword()) return <Navigate to="/change-password" replace />;
  if (roles && role && !roles.includes(role)) return <Navigate to="/" replace />;

  return <AppShell>{children}</AppShell>;
}

const PEOPLE_OPS: Role[] = ["MANAGER", "HR", "ADMIN"];

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendance"
          element={
            <ProtectedRoute>
              <AttendancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leave"
          element={
            <ProtectedRoute>
              <LeavePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/approvals"
          element={
            <ProtectedRoute roles={PEOPLE_OPS}>
              <ApprovalsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/team"
          element={
            <ProtectedRoute roles={PEOPLE_OPS}>
              <TeamAttendancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <EmployeesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees/new"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <CreateEmployeeWizard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees/:id"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <EmployeeDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <AuditLogPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

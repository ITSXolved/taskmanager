"use client";

import { useApp } from "@/lib/store";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { SuperAdminDashboard } from "@/components/dashboard/super-admin-dashboard";
import { UserDashboard } from "@/components/dashboard/user-dashboard";

export default function DashboardPage() {
  const { isAdmin, isSuperAdmin } = useApp();
  if (isSuperAdmin) return <SuperAdminDashboard />;
  return isAdmin ? <AdminDashboard /> : <UserDashboard />;
}

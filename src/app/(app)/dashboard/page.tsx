"use client";

import { useApp } from "@/lib/store";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { UserDashboard } from "@/components/dashboard/user-dashboard";

export default function DashboardPage() {
  const { isAdmin } = useApp();
  return isAdmin ? <AdminDashboard /> : <UserDashboard />;
}

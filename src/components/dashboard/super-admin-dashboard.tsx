"use client";

import { useMemo, useState } from "react";
import { Building2, ListTodo, ShieldCheck, Users } from "lucide-react";
import { useApp } from "@/lib/store";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminDashboard } from "./admin-dashboard";

export function SuperAdminDashboard() {
  const { currentUser, members, tasks, organizations } = useApp();
  const [orgId, setOrgId] = useState("all");
  const [adminId, setAdminId] = useState("all");

  // Admins available for the filter (scoped to the selected org).
  const admins = useMemo(
    () =>
      members.filter(
        (m) =>
          (m.role === "admin" || m.role === "super_admin") &&
          (orgId === "all" || m.orgId === orgId)
      ),
    [members, orgId]
  );

  const scopedMembers = useMemo(() => {
    let list = members;
    if (orgId !== "all") list = list.filter((m) => m.orgId === orgId);
    if (adminId !== "all")
      list = list.filter((m) => m.id === adminId || m.managerId === adminId);
    return list;
  }, [members, orgId, adminId]);

  const scopedTasks = useMemo(() => {
    if (orgId === "all" && adminId === "all") return tasks;
    const ids = new Set(scopedMembers.map((m) => m.id));
    return tasks.filter((t) => t.assigneeIds.some((id) => ids.has(id)));
  }, [tasks, scopedMembers, orgId, adminId]);

  if (!currentUser) return null;

  const adminCount = members.filter(
    (m) => m.role === "admin" || m.role === "super_admin"
  ).length;
  const userCount = members.filter((m) => m.role === "user").length;

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Welcome back, ${currentUser.name.split(" ")[0]} 👋`}
      />

      {/* Platform-wide KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Organizations" value={organizations.length} icon={Building2} accent="primary" />
        <KpiCard label="Admins" value={adminCount} icon={ShieldCheck} accent="info" />
        <KpiCard label="Members" value={userCount} icon={Users} accent="success" />
        <KpiCard label="Total Tasks" value={tasks.length} icon={ListTodo} accent="warning" />
      </div>

      {/* Org + admin filter */}
      <Card className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <span className="text-sm font-medium">Filter</span>
        <Select
          value={orgId}
          onValueChange={(v) => {
            setOrgId(v);
            setAdminId("all");
          }}
        >
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="All organizations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All organizations</SelectItem>
            {organizations.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={adminId} onValueChange={setAdminId}>
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="All admins" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All admins</SelectItem>
            {admins.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground sm:ml-auto">
          {scopedTasks.length} tasks · {scopedMembers.length} members
        </span>
      </Card>

      {/* Scoped admin dashboard (charts, tables, scrum) */}
      <AdminDashboard tasks={scopedTasks} members={scopedMembers} showHeader={false} />
    </div>
  );
}

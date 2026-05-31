"use client";

import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  ListTodo,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { useApp } from "@/lib/store";
import {
  daysOverdue,
  isOverdue,
  taskStats,
  upcomingDeadlines,
} from "@/lib/analytics";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { PriorityBadge } from "@/components/shared/badges";
import { Avatar } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DonutChart,
  MemberBarChart,
  TrendChart,
} from "@/components/charts/charts";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function AdminDashboard() {
  const { tasks, members, currentUser, trend } = useApp();
  if (!currentUser) return null;
  const stats = taskStats(tasks);
  const upcoming = upcomingDeadlines(tasks).slice(0, 6);
  const overdueTasks = tasks.filter(isOverdue);

  const teamMembers = members.filter((m) => m.role === "user" && m.active);

  const memberData = teamMembers.map((m) => {
    const mine = tasks.filter((t) => t.assigneeIds.includes(m.id));
    return {
      name: m.name.split(" ")[0],
      completed: mine.filter((t) => t.status === "done").length,
      pending: mine.filter((t) => t.status !== "done").length,
    };
  });

  const scrum = teamMembers.map((m) => {
    const mine = tasks.filter((t) => t.assigneeIds.includes(m.id));
    return {
      member: m,
      done: mine.filter((t) => t.status === "done").length,
      inProgress: mine.filter(
        (t) => t.status === "in_progress" || t.status === "in_review"
      ).length,
      blocked: mine.filter((t) => t.blocked).length,
    };
  });

  return (
    <div className="space-y-5">
      <PageHeader title={`Welcome back, ${currentUser.name.split(" ")[0]} 👋`} />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total Tasks"
          value={stats.total}
          icon={ListTodo}
          accent="primary"
          trend={8}
          trendLabel="vs last week"
        />
        <KpiCard
          label="Completed Today"
          value={stats.completedTodayCount}
          icon={CheckCircle2}
          accent="success"
          trend={12}
          trendLabel="vs yesterday"
        />
        <KpiCard
          label="Overdue"
          value={stats.overdue}
          icon={AlertTriangle}
          accent="destructive"
          trend={-3}
          trendLabel="vs last week"
          invertTrend
        />
        <KpiCard
          label="In Progress"
          value={stats.inProgress}
          icon={Loader2}
          accent="info"
          trend={5}
          trendLabel="active now"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart value={stats.completionRate} />
            <div className="mt-2 flex items-center justify-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-chart-1" />
                {stats.done} Done
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                {stats.total - stats.done} Remaining
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tasks per Member</CardTitle>
          </CardHeader>
          <CardContent>
            <MemberBarChart data={memberData} />
          </CardContent>
        </Card>
      </div>

      {/* Trend */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Completion Trend
            </CardTitle>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-chart-1" /> Completed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-chart-5" /> Created
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <TrendChart data={trend} />
        </CardContent>
      </Card>

      {/* Tables row */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Overdue table */}
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Overdue Assignments</CardTitle>
            </div>
            <Badge variant="destructive">{overdueTasks.length} overdue</Badge>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-y border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-2.5 text-left font-semibold">Member</th>
                    <th className="px-3 py-2.5 text-left font-semibold">Task</th>
                    <th className="px-3 py-2.5 text-left font-semibold">Overdue</th>
                    <th className="px-5 py-2.5 text-left font-semibold">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {overdueTasks.map((t) => {
                    const assignee = members.find((m) =>
                      t.assigneeIds.includes(m.id)
                    );
                    return (
                      <tr key={t.id} className="hover:bg-accent/30">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar
                              name={assignee?.name ?? "?"}
                              color={assignee?.avatarColor}
                              size="xs"
                            />
                            <span className="truncate text-sm font-medium">
                              {assignee?.name}
                            </span>
                          </div>
                        </td>
                        <td className="max-w-[200px] px-3 py-3">
                          <span className="line-clamp-1 text-sm">{t.title}</span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="font-semibold text-destructive">
                            {daysOverdue(t)}d
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <PriorityBadge priority={t.priority} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming deadlines */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.map((t) => {
              const assignee = members.find((m) =>
                t.assigneeIds.includes(m.id)
              );
              return (
                <Link
                  key={t.id}
                  href="/tasks"
                  className="flex items-center gap-3 rounded-lg border border-border p-2.5 transition-colors hover:bg-accent/40"
                >
                  <div className="flex h-9 w-9 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <span className="text-[10px] font-medium uppercase leading-none">
                      {format(new Date(t.dueDate), "MMM")}
                    </span>
                    <span className="text-sm font-bold leading-none">
                      {format(new Date(t.dueDate), "d")}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {assignee?.name.split(" ")[0]} ·{" "}
                      {formatDistanceToNow(new Date(t.dueDate), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <PriorityBadge priority={t.priority} />
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Scrum summary */}
      <Card>
        <CardHeader>
          <CardTitle>Scrum Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {scrum.map((s) => (
              <div
                key={s.member.id}
                className="rounded-xl border border-border p-4"
              >
                <div className="mb-3 flex items-center gap-2.5">
                  <Avatar
                    name={s.member.name}
                    color={s.member.avatarColor}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {s.member.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.member.title}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <ScrumStat label="Done" value={s.done} color="text-success" />
                  <ScrumStat
                    label="Active"
                    value={s.inProgress}
                    color="text-info"
                  />
                  <ScrumStat
                    label="Blocked"
                    value={s.blocked}
                    color="text-destructive"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ScrumStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-lg bg-muted/50 py-2">
      <p className={cn("text-lg font-bold tabular-nums", color)}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

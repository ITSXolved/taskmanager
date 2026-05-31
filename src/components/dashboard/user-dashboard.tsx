"use client";

import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  ListTodo,
  AlertTriangle,
  MessageSquarePlus,
  CheckCheck,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { taskStats, upcomingDeadlines } from "@/lib/analytics";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { PriorityBadge } from "@/components/shared/badges";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DonutChart } from "@/components/charts/charts";

export function UserDashboard() {
  const { tasks, currentUser, activity, getMember } = useApp();
  if (!currentUser) return null;
  const myTasks = tasks.filter((t) => t.assigneeIds.includes(currentUser.id));
  const stats = taskStats(myTasks);
  const upcoming = upcomingDeadlines(myTasks).slice(0, 5);

  const nextTask = myTasks.find((t) => t.status !== "done");

  return (
    <div className="space-y-5">
      <PageHeader title={`Hi ${currentUser.name.split(" ")[0]} 👋`} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="My Tasks" value={stats.total} icon={ListTodo} accent="primary" />
        <KpiCard
          label="Due Today"
          value={stats.dueTodayCount}
          icon={CalendarClock}
          accent="warning"
        />
        <KpiCard
          label="Completed"
          value={stats.done}
          icon={CheckCircle2}
          accent="success"
          trend={10}
          trendLabel="this week"
        />
        <KpiCard
          label="Overdue"
          value={stats.overdue}
          icon={AlertTriangle}
          accent="destructive"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>My Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart value={stats.completionRate} label="Done" />
          </CardContent>
        </Card>

        {/* Quick actions + upcoming */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>My Upcoming Deadlines</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  nextTask
                    ? toast.success(`Marked "${nextTask.title}" as done`)
                    : toast.info("No active tasks")
                }
              >
                <CheckCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Mark done</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toast.success("Comment box opened")}
              >
                <MessageSquarePlus className="h-4 w-4" />
                <span className="hidden sm:inline">Comment</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No upcoming deadlines. Great work! 🎉
              </p>
            ) : (
              upcoming.map((t) => (
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
                      Due{" "}
                      {formatDistanceToNow(new Date(t.dueDate), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <PriorityBadge priority={t.priority} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative space-y-4 before:absolute before:left-[15px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
            {activity.map((a) => {
              const actor = getMember(a.actorId);
              return (
                <div key={a.id} className="relative flex items-start gap-3">
                  <Avatar
                    name={actor?.name ?? "?"}
                    color={actor?.avatarColor}
                    size="sm"
                    className="z-10"
                  />
                  <div className="flex-1 pt-1">
                    <p className="text-sm">
                      <span className="font-semibold">{actor?.name}</span>{" "}
                      <span className="text-muted-foreground">{a.action}</span>{" "}
                      <span className="font-medium">{a.target}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(a.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

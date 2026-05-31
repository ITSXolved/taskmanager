"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Circle,
  Crown,
  ListChecks,
  Users,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { projectProgress } from "@/lib/analytics";
import { ProgressBar } from "@/components/shared/progress-bar";
import { PriorityBadge, StatusChip } from "@/components/shared/badges";
import { AvatarGroup } from "@/components/shared/avatar-group";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PROJECT_STATUS_META } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { projects, tasks, members, activity, getMember } = useApp();
  const project = projects.find((p) => p.id === id);
  if (!project) return notFound();

  const progress = projectProgress(project, tasks);
  const projectTasks = tasks.filter((t) => t.projectId === project.id);
  const projectMembers = members.filter((m) => project.memberIds.includes(m.id));
  const owner = getMember(project.ownerId);
  const meta = PROJECT_STATUS_META[project.status];

  return (
    <div className="space-y-5">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Link>

      {/* Header */}
      <Card className="overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-primary to-chart-5" />
        <CardContent className="pt-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  {project.name}
                </h1>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                    meta.className
                  )}
                >
                  {meta.label}
                </span>
              </div>
              <p className="max-w-2xl text-sm text-muted-foreground">
                {project.description}
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Crown className="h-4 w-4 text-amber-500" />
                  {owner?.name}
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  Due {format(new Date(project.deadline), "MMM d, yyyy")}
                </span>
                <span className="flex items-center gap-1.5">
                  <ListChecks className="h-4 w-4" />
                  {projectTasks.length} tasks
                </span>
              </div>
            </div>
            <div className="w-full lg:w-64">
              <ProgressBar
                value={progress}
                label="Overall progress"
                indicatorClassName={progress === 100 ? "bg-success" : undefined}
              />
              <div className="mt-3">
                <AvatarGroup members={projectMembers} size="sm" max={6} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Milestone timeline */}
      {project.milestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {project.milestones.map((m, i) => (
                <div
                  key={m.id}
                  className="relative flex min-w-[160px] flex-1 flex-col items-center text-center"
                >
                  {i < project.milestones.length - 1 && (
                    <div
                      className={cn(
                        "absolute left-1/2 top-3 h-0.5 w-full",
                        m.done ? "bg-success" : "bg-border"
                      )}
                    />
                  )}
                  <div
                    className={cn(
                      "relative z-10 flex h-6 w-6 items-center justify-center rounded-full",
                      m.done
                        ? "bg-success text-success-foreground"
                        : "border-2 border-border bg-card text-muted-foreground"
                    )}
                  >
                    {m.done ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Circle className="h-3 w-3" />
                    )}
                  </div>
                  <p className="mt-2 text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(m.date), "MMM d")}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">
            <ListChecks /> Tasks
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users /> Team
          </TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks">
          <Card className="divide-y divide-border">
            {projectTasks.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No tasks in this project yet.
              </p>
            ) : (
              projectTasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 p-4 transition-colors hover:bg-accent/30"
                >
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Due {format(new Date(t.dueDate), "MMM d")}
                    </p>
                  </div>
                  <PriorityBadge priority={t.priority} />
                  <StatusChip status={t.status} />
                  <AvatarGroup
                    members={members.filter((m) =>
                      t.assigneeIds.includes(m.id)
                    )}
                    size="xs"
                  />
                </div>
              ))
            )}
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card>
            <CardContent className="grid grid-cols-1 gap-3 pt-5 sm:grid-cols-2">
              {projectMembers.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl border border-border p-3"
                >
                  <Avatar name={m.name} color={m.avatarColor} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{m.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {m.title}
                    </p>
                  </div>
                  {m.id === project.ownerId && (
                    <Badge variant="warning">Owner</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardContent className="pt-5">
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
                      <div className="pt-1">
                        <p className="text-sm">
                          <span className="font-semibold">{actor?.name}</span>{" "}
                          <span className="text-muted-foreground">
                            {a.action}
                          </span>{" "}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

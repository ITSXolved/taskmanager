"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Download,
  Loader2,
  Play,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { isOverdue } from "@/lib/analytics";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { PriorityBadge } from "@/components/shared/badges";
import { StartMeetingMode } from "@/components/scrum/start-meeting-mode";
import { Member, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ScrumPage() {
  const { tasks, members, isAdmin, currentUser } = useApp();
  const [date, setDate] = useState("2026-05-31");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [meeting, setMeeting] = useState(false);

  const teamMembers = isAdmin
    ? members.filter((m) => m.active)
    : members.filter((m) => m.id === currentUser?.id);

  const done = tasks.filter((t) => t.status === "done");
  const inProgress = tasks.filter(
    (t) => t.status === "in_progress" || t.status === "in_review"
  );
  const blocked = tasks.filter((t) => t.blocked || isOverdue(t));

  return (
    <div>
      <PageHeader
        title="Daily Scrum"
        actions={
          <>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-auto"
            />
            <Button
              variant="outline"
              onClick={() => toast.success("Exporting scrum report to PDF…")}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export PDF</span>
            </Button>
            <Button onClick={() => setMeeting(true)}>
              <Play className="h-4 w-4" />
              <span className="hidden sm:inline">Start Meeting</span>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ScrumColumn
          title="Done Yesterday"
          icon={CheckCircle2}
          accent="text-success bg-success/10"
          tasks={done}
          members={members}
        />
        <ScrumColumn
          title="In Progress Today"
          icon={Loader2}
          accent="text-info bg-info/10"
          tasks={inProgress}
          members={members}
        />
        <ScrumColumn
          title="Blockers / Overdue"
          icon={AlertTriangle}
          accent="text-destructive bg-destructive/10"
          tasks={blocked}
          members={members}
          flag
        />
      </div>

      {/* Per-member expandable rows */}
      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Per-Member Standup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {teamMembers.map((m) => {
            const mine = tasks.filter((t) => t.assigneeIds.includes(m.id));
            const isOpen = expanded === m.id;
            return (
              <div
                key={m.id}
                className="overflow-hidden rounded-xl border border-border"
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : m.id)}
                  className="flex w-full items-center gap-3 p-3 transition-colors hover:bg-accent/30"
                >
                  <Avatar name={m.name} color={m.avatarColor} size="sm" />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-semibold">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {mine.filter((t) => t.status === "done").length} done ·{" "}
                      {
                        mine.filter(
                          (t) =>
                            t.status === "in_progress" ||
                            t.status === "in_review"
                        ).length
                      }{" "}
                      active ·{" "}
                      {mine.filter((t) => t.blocked).length} blocked
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="space-y-1.5 border-t border-border bg-muted/20 p-3 animate-fade-in">
                    {mine.length === 0 ? (
                      <p className="py-2 text-center text-sm text-muted-foreground">
                        No tasks assigned.
                      </p>
                    ) : (
                      mine.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center gap-2 rounded-lg bg-card p-2.5"
                        >
                          <span className="min-w-0 flex-1 truncate text-sm">
                            {t.title}
                          </span>
                          {t.blocked && (
                            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-destructive">
                              Blocked
                            </span>
                          )}
                          <PriorityBadge priority={t.priority} />
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <StartMeetingMode
        open={meeting}
        onClose={() => setMeeting(false)}
        members={teamMembers}
        date={date}
      />
    </div>
  );
}

function ScrumColumn({
  title,
  icon: Icon,
  accent,
  tasks,
  members,
  flag,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  tasks: Task[];
  members: Member[];
  flag?: boolean;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", accent)}>
            <Icon className="h-4 w-4" />
          </div>
          <CardTitle className="text-sm">{title}</CardTitle>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {tasks.length}
        </span>
      </CardHeader>
      <CardContent className="flex-1 space-y-2">
        {tasks.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nothing here.
          </p>
        ) : (
          tasks.map((t) => {
            const assignee = members.find((m) => t.assigneeIds.includes(m.id));
            return (
              <div
                key={t.id}
                className={cn(
                  "rounded-lg border p-3",
                  flag ? "border-destructive/30 bg-destructive/5" : "border-border"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-sm font-medium">{t.title}</p>
                  <PriorityBadge priority={t.priority} />
                </div>
                {assignee && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <Avatar
                      name={assignee.name}
                      color={assignee.avatarColor}
                      size="xs"
                    />
                    <span className="text-xs text-muted-foreground">
                      {assignee.name}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

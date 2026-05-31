"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { isOverdue } from "@/lib/analytics";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/shared/badges";
import { Member, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StartMeetingMode({
  open,
  onClose,
  members,
  date,
}: {
  open: boolean;
  onClose: () => void;
  members: Member[];
  date: string;
}) {
  const { tasks } = useApp();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "ArrowRight")
        setIndex((i) => Math.min(i + 1, members.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, members.length, onClose]);

  if (!open) return null;
  const member = members[index];
  if (!member) return null;

  const mine = tasks.filter((t) => t.assigneeIds.includes(member.id));
  const done = mine.filter((t) => t.status === "done");
  const active = mine.filter(
    (t) => t.status === "in_progress" || t.status === "in_review"
  );
  const blocked = mine.filter((t) => t.blocked || isOverdue(t));

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Daily Scrum · {format(new Date(date), "MMM d, yyyy")}
          </p>
          <p className="text-sm font-semibold">
            Member {index + 1} of {members.length}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5 py-3">
        {members.map((m, i) => (
          <button
            key={m.id}
            onClick={() => setIndex(i)}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === index ? "w-8 bg-primary" : "w-1.5 bg-border"
            )}
          />
        ))}
      </div>

      {/* Member focus */}
      <div className="flex flex-1 items-center justify-center overflow-y-auto p-6">
        <div className="w-full max-w-3xl animate-scale-in">
          <div className="mb-8 flex flex-col items-center text-center">
            <Avatar name={member.name} color={member.avatarColor} size="xl" />
            <h2 className="mt-4 text-3xl font-bold tracking-tight">
              {member.name}
            </h2>
            <p className="text-muted-foreground">{member.title}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <MeetingCol
              title="Done"
              icon={CheckCircle2}
              accent="text-success"
              tasks={done}
            />
            <MeetingCol
              title="In Progress"
              icon={Loader2}
              accent="text-info"
              tasks={active}
            />
            <MeetingCol
              title="Blockers"
              icon={AlertTriangle}
              accent="text-destructive"
              tasks={blocked}
            />
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between border-t border-border px-6 py-4">
        <Button
          variant="outline"
          onClick={() => setIndex((i) => Math.max(i - 1, 0))}
          disabled={index === 0}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <span className="text-xs text-muted-foreground">
          Use ← → arrow keys to navigate
        </span>
        {index < members.length - 1 ? (
          <Button onClick={() => setIndex((i) => i + 1)}>
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={onClose}>Finish</Button>
        )}
      </div>
    </div>
  );
}

function MeetingCol({
  title,
  icon: Icon,
  accent,
  tasks,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  tasks: Task[];
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className={cn("mb-3 flex items-center gap-2 font-semibold", accent)}>
        <Icon className="h-4 w-4" />
        {title} ({tasks.length})
      </div>
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing to report.</p>
        ) : (
          tasks.map((t) => (
            <div key={t.id} className="rounded-lg bg-muted/40 p-2.5">
              <p className="line-clamp-2 text-sm font-medium">{t.title}</p>
              <div className="mt-1.5">
                <PriorityBadge priority={t.priority} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

"use client";

import { format } from "date-fns";
import { CalendarDays, MessageSquare, Paperclip, GripVertical } from "lucide-react";
import { Task } from "@/lib/types";
import { useApp } from "@/lib/store";
import { PriorityBadge } from "@/components/shared/badges";
import { AvatarGroup } from "@/components/shared/avatar-group";
import { isOverdue } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export function TaskCard({
  task,
  onClick,
  dragHandleProps,
  dragging,
}: {
  task: Task;
  onClick?: () => void;
  dragHandleProps?: Record<string, unknown>;
  dragging?: boolean;
}) {
  const { members } = useApp();
  const assignees = members.filter((m) => task.assigneeIds.includes(m.id));
  const overdue = isOverdue(task);

  return (
    <div
      onClick={onClick}
      className={cn(
        "group cursor-pointer rounded-xl border border-border bg-card p-3 shadow-sm transition-all hover:shadow-card-hover",
        dragging && "rotate-2 opacity-90 shadow-glass ring-2 ring-primary/40"
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <PriorityBadge priority={task.priority} />
          {task.blocked && (
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
              Blocked
            </span>
          )}
        </div>
        <button
          {...dragHandleProps}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab text-muted-foreground/40 opacity-0 transition-opacity hover:text-muted-foreground group-hover:opacity-100 active:cursor-grabbing"
          aria-label="Drag"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>

      <p className="mb-2 line-clamp-2 text-sm font-medium leading-snug">
        {task.title}
      </p>

      {task.categories.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-1">
          {task.categories.map((c) => (
            <span
              key={c}
              className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span
            className={cn(
              "flex items-center gap-1",
              overdue && "font-medium text-destructive"
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            {format(new Date(task.dueDate), "MMM d")}
          </span>
          {task.attachments.length > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip className="h-3.5 w-3.5" />
              {task.attachments.length}
            </span>
          )}
          {task.comments.length > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              {task.comments.length}
            </span>
          )}
        </div>
        <AvatarGroup members={assignees} size="xs" max={3} />
      </div>
    </div>
  );
}

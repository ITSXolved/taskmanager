"use client";

import { formatDistanceToNow } from "date-fns";
import {
  AtSign,
  Bell,
  CheckCircle2,
  Clock,
  FolderKanban,
  MessageSquare,
  UserPlus,
  LucideIcon,
} from "lucide-react";
import { AppNotification, NotificationType } from "@/lib/types";
import { cn } from "@/lib/utils";

const iconMap: Record<NotificationType, { Icon: LucideIcon; color: string }> = {
  mention: { Icon: AtSign, color: "text-primary bg-primary/10" },
  task_assigned: { Icon: UserPlus, color: "text-info bg-info/10" },
  comment: { Icon: MessageSquare, color: "text-chart-4 bg-chart-4/10" },
  due_soon: { Icon: Clock, color: "text-amber-500 bg-amber-500/10" },
  status_change: { Icon: CheckCircle2, color: "text-success bg-success/10" },
  project: { Icon: FolderKanban, color: "text-chart-2 bg-chart-2/10" },
};

export function NotificationItem({
  notification,
  onClick,
}: {
  notification: AppNotification;
  onClick?: () => void;
}) {
  const { Icon, color } = iconMap[notification.type] ?? {
    Icon: Bell,
    color: "text-muted-foreground bg-muted",
  };
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
        notification.read
          ? "border-transparent hover:bg-accent/40"
          : "border-primary/20 bg-primary/[0.04] hover:bg-primary/[0.07]"
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          color
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-foreground/90">
          {notification.message}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.createdAt), {
            addSuffix: true,
          })}
        </p>
      </div>
      {!notification.read && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
      )}
    </button>
  );
}

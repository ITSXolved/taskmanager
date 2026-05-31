"use client";

import { isToday, isYesterday } from "date-fns";
import { BellOff, CheckCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NotificationItem } from "@/components/shared/notification-item";
import { EmptyState } from "@/components/shared/empty-state";
import { useApp } from "@/lib/store";
import { AppNotification } from "@/lib/types";

function group(notifications: AppNotification[]) {
  const groups: Record<string, AppNotification[]> = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  };
  for (const n of notifications) {
    const d = new Date(n.createdAt);
    if (isToday(d)) groups.Today.push(n);
    else if (isYesterday(d)) groups.Yesterday.push(n);
    else groups.Earlier.push(n);
  }
  return groups;
}

export function NotificationDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { notifications, unreadCount, markAllRead, markNotificationRead } =
    useApp();
  const groups = group(notifications);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent side="right" className="p-0">
        <DialogHeader className="flex-row items-center justify-between space-y-0 border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <DialogTitle>Notifications</DialogTitle>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                {unreadCount} new
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="flex items-center justify-end border-b border-border px-5 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {notifications.length === 0 ? (
            <EmptyState
              icon={BellOff}
              title="You're all caught up"
            />
          ) : (
            Object.entries(groups).map(([label, items]) =>
              items.length === 0 ? null : (
                <div key={label} className="mb-4">
                  <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {label}
                  </p>
                  <div className="space-y-1">
                    {items.map((n) => (
                      <NotificationItem
                        key={n.id}
                        notification={n}
                        onClick={() => markNotificationRead(n.id)}
                      />
                    ))}
                  </div>
                </div>
              )
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { isToday, isYesterday } from "date-fns";
import { BellOff, CheckCheck } from "lucide-react";
import { useApp } from "@/lib/store";
import { PageHeader } from "@/components/shared/page-header";
import { NotificationItem } from "@/components/shared/notification-item";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

export default function NotificationsPage() {
  const { notifications, unreadCount, markAllRead, markNotificationRead } =
    useApp();
  const groups = group(notifications);

  return (
    <div>
      <PageHeader
        title="Notifications"
        actions={
          <Button
            variant="outline"
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-5">
          {notifications.length === 0 ? (
            <EmptyState
              icon={BellOff}
              title="No notifications"
            />
          ) : (
            <div className="mx-auto max-w-2xl space-y-5">
              {Object.entries(groups).map(([label, items]) =>
                items.length === 0 ? null : (
                  <div key={label}>
                    <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {label}
                    </p>
                    <div className="space-y-1.5">
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
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

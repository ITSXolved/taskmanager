"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Copy,
  KeyRound,
  Mail,
  Power,
  Briefcase,
  CalendarDays,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DonutChart } from "@/components/charts/charts";
import { PriorityBadge, StatusChip } from "@/components/shared/badges";
import { useApp } from "@/lib/store";
import { Member } from "@/lib/types";
import { taskStats } from "@/lib/analytics";
import { resetPassword, setUserActive } from "@/lib/admin-api";

export function MemberDetailPanel({
  member,
  open,
  onOpenChange,
}: {
  member: Member | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { tasks, refreshMembers } = useApp();
  const [resetPw, setResetPw] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!member) return null;
  const myTasks = tasks.filter((t) => t.assigneeIds.includes(member.id));
  const stats = taskStats(myTasks);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent side="right" className="flex flex-col p-0 sm:max-w-md">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>Member Details</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {/* Profile */}
          <div className="flex flex-col items-center text-center">
            <Avatar name={member.name} color={member.avatarColor} size="xl" />
            <h3 className="mt-3 text-lg font-bold">{member.name}</h3>
            <div className="mt-1.5 flex items-center gap-2">
              <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                {member.role === "admin" ? "Administrator" : "Member"}
              </Badge>
              <Badge variant={member.active ? "success" : "destructive"}>
                {member.active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>

          <div className="space-y-2.5 rounded-xl border border-border p-4 text-sm">
            <InfoRow icon={Mail} label="Email" value={member.email} />
            <InfoRow icon={Briefcase} label="Title" value={member.title} />
            <InfoRow
              icon={CalendarDays}
              label="Joined"
              value={format(new Date(member.joinedAt), "MMM d, yyyy")}
            />
          </div>

          {/* Completion */}
          <div className="rounded-xl border border-border p-4">
            <p className="mb-2 text-sm font-semibold">Completion Rate</p>
            <DonutChart value={stats.completionRate} label="Done" />
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <Stat label="Total" value={stats.total} />
              <Stat label="Done" value={stats.done} color="text-success" />
              <Stat label="Overdue" value={stats.overdue} color="text-destructive" />
            </div>
          </div>

          {/* Assigned tasks */}
          <div>
            <p className="mb-2 text-sm font-semibold">
              Assigned Tasks ({myTasks.length})
            </p>
            <div className="space-y-2">
              {myTasks.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 rounded-lg border border-border p-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium">{t.title}</p>
                  </div>
                  <PriorityBadge priority={t.priority} />
                  <StatusChip status={t.status} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 border-t border-border p-4">
          {resetPw && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 p-2.5 animate-fade-in">
              <div>
                <p className="text-xs text-muted-foreground">New temp password</p>
                <code className="font-mono text-sm">{resetPw}</code>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  navigator.clipboard?.writeText(resetPw);
                  toast.success("Copied");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const res = await resetPassword(member.id);
                  setResetPw(res.tempPassword);
                  toast.success("Password reset");
                } catch (err) {
                  toast.error((err as Error).message || "Reset failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <KeyRound className="h-4 w-4" />
              Reset Password
            </Button>
            <Button
              variant={member.active ? "destructive" : "default"}
              className="flex-1"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await setUserActive(member.id, !member.active);
                  refreshMembers();
                  toast.success(
                    member.active ? "Member deactivated" : "Member reactivated"
                  );
                } catch (err) {
                  toast.error((err as Error).message || "Update failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Power className="h-4 w-4" />
              {member.active ? "Deactivate" : "Reactivate"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="ml-auto font-medium">{value}</span>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="rounded-lg bg-muted/50 py-2">
      <p className={`text-lg font-bold tabular-nums ${color ?? ""}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

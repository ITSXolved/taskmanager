"use client";

import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Download,
  Loader2,
  Play,
  CalendarX,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { isOverdue } from "@/lib/analytics";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar } from "@/components/ui/avatar";
import { PriorityBadge } from "@/components/shared/badges";
import { StartMeetingMode } from "@/components/scrum/start-meeting-mode";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Member, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ScrumPage() {
  const TIME_SLOTS = [
    "09:00 AM - 09:30 AM",
    "09:30 AM - 10:00 AM",
    "10:00 AM - 10:30 AM",
    "10:30 AM - 11:00 AM",
    "11:00 AM - 11:30 AM",
    "11:30 AM - 12:00 PM",
  ];

  const {
    tasks,
    members,
    isAdmin,
    currentUser,
    scrumCancellations,
    cancelScrumMeeting,
    restoreScrumMeeting,
  } = useApp();
  const [date, setDate] = useState("2026-05-31");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [meeting, setMeeting] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelTimeSlot, setCancelTimeSlot] = useState(TIME_SLOTS[0]);

  const cancellations = scrumCancellations.filter(
    (c) => c.date === date && c.org_id === currentUser?.orgId
  );
  const isCanceled = cancellations.length > 0;

  async function handleCancelMeeting() {
    try {
      await cancelScrumMeeting(date, cancelTimeSlot, cancelReason || null);
      setCancelOpen(false);
      setCancelReason("");
      toast.success(`Scrum meeting for ${cancelTimeSlot} canceled`);
    } catch {
      // error handled in store action
    }
  }

  async function handleRestoreMeeting(timeSlot: string) {
    try {
      await restoreScrumMeeting(date, timeSlot);
      toast.success(`Scrum meeting for ${timeSlot} restored`);
    } catch {
      // error handled in store action
    }
  }

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
            <Button onClick={() => setMeeting(true)} disabled={teamMembers.length === 0}>
              <Play className="h-4 w-4" />
              <span className="hidden sm:inline">Start Meeting</span>
            </Button>
            {isAdmin && (
              <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    Cancel Meeting
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cancel Scrum Meeting</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to cancel a Daily Scrum meeting for {format(new Date(date + "T00:00:00"), "MMMM d, yyyy")}?
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="cancel-time-slot" className="text-sm font-semibold">
                        Select Time Slot
                      </Label>
                      <Select value={cancelTimeSlot} onValueChange={setCancelTimeSlot}>
                        <SelectTrigger id="cancel-time-slot" className="w-full bg-card">
                          <SelectValue placeholder="Select time slot..." />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_SLOTS.map((slot) => (
                            <SelectItem key={slot} value={slot}>
                              {slot}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cancel-reason" className="text-sm font-semibold">
                        Reason for cancellation (optional)
                      </Label>
                      <Input
                        id="cancel-reason"
                        placeholder="e.g. Public Holiday, Team Day Out, Sprints Complete"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCancelOpen(false)}>
                      Go Back
                    </Button>
                    <Button variant="destructive" onClick={handleCancelMeeting}>
                      Cancel Meeting
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </>
        }
      />

      {isCanceled && (
        <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-destructive flex flex-col gap-3 backdrop-blur-sm animate-fade-in">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Canceled Daily Scrum Meetings</p>
              <p className="text-xs text-destructive/90 mt-0.5">
                The following Daily Scrum meetings have been canceled for {format(new Date(date + "T00:00:00"), "MMMM d, yyyy")}:
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {cancellations.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg bg-destructive/10 border border-destructive/10 px-3 py-2 text-xs font-medium">
                <div className="flex items-center gap-2">
                  <CalendarX className="h-4 w-4" />
                  <span>{c.time_slot}</span>
                  {c.reason && <span className="text-destructive/80 font-normal ml-1">({c.reason})</span>}
                </div>
                {isAdmin && (
                  <Button size="sm" variant="ghost" className="h-7 px-2 hover:bg-destructive/20 text-destructive font-semibold" onClick={() => handleRestoreMeeting(c.time_slot)}>
                    Restore
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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

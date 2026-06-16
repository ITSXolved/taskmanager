"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  CalendarOff,
  Download,
  Plus,
  Trash2,
  Clock,
  CalendarX,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { Member, Organization } from "@/lib/types";
import {
  AttendanceExemption,
  AttendanceRecord,
  AttendanceSettings,
  AttendanceStatus,
  DEFAULT_SETTINGS,
  STATUS_META,
  WEEKDAYS,
  downloadCsv,
  expectationForDate,
  fmtLate,
  fmtTime,
  lateMinutes,
} from "@/lib/attendance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

const TODAY = "2026-06-01";

export interface AttendanceApi {
  settings: AttendanceSettings[];
  exemptions: AttendanceExemption[];
  records: AttendanceRecord[];
  markAttendance: (input: {
    userId: string;
    orgId: string | null;
    date: string;
    status: AttendanceStatus;
    checkInTime: string | null;
  }) => Promise<void>;
  saveSettings: (s: AttendanceSettings) => Promise<void>;
  addExemption: (input: {
    orgId: string;
    date: string;
    expectedTime: string | null;
    reason: string | null;
  }) => Promise<void>;
  deleteExemption: (id: string) => Promise<void>;
}

function settingsFor(api: AttendanceApi, orgId: string): AttendanceSettings {
  return (
    api.settings.find((s) => s.orgId === orgId) ?? {
      orgId,
      ...DEFAULT_SETTINGS,
    }
  );
}

function OrgPicker({
  organizations,
  value,
  onChange,
}: {
  organizations: Organization[];
  value: string;
  onChange: (v: string) => void;
}) {
  if (organizations.length <= 1) return null;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="sm:w-56">
        <SelectValue placeholder="Organization" />
      </SelectTrigger>
      <SelectContent>
        {organizations.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ============================ Mark attendance ============================ */
export function MarkAttendance({
  api,
  members,
  organizations,
  defaultOrg,
  lockOrg,
}: {
  api: AttendanceApi;
  members: Member[];
  organizations: Organization[];
  defaultOrg: string;
  lockOrg: boolean;
}) {
  const [orgId, setOrgId] = useState(defaultOrg);
  const [date, setDate] = useState(TODAY);

  const orgMembers = members.filter(
    (m) => m.orgId === orgId && m.role !== "super_admin"
  );
  const settings = settingsFor(api, orgId);
  const expectation = expectationForDate(date, settings, api.exemptions);

  function recordFor(userId: string) {
    return api.records.find((r) => r.userId === userId && r.date === date);
  }

  async function mark(
    m: Member,
    status: AttendanceStatus,
    checkInTime: string | null
  ) {
    try {
      await api.markAttendance({
        userId: m.id,
        orgId: m.orgId ?? orgId,
        date,
        status,
        checkInTime,
      });
    } catch (err) {
      toast.error((err as Error).message || "Failed to save");
    }
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        {!lockOrg && (
          <OrgPicker organizations={organizations} value={orgId} onChange={setOrgId} />
        )}
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="sm:w-44"
        />
        <div className="flex items-center gap-2 text-sm sm:ml-auto">
          {expectation.exempt ? (
            <Badge variant="warning">
              <CalendarOff className="h-3 w-3" />
              {expectation.reason || "Day off"}
            </Badge>
          ) : (
            <Badge variant="info">
              <Clock className="h-3 w-3" />
              Expected by {fmtTime(expectation.expectedTime ?? settings.expectedTime)}
            </Badge>
          )}
        </div>
      </Card>

      {orgMembers.length === 0 ? (
        <Card>
          <EmptyState icon={CalendarOff} title="No members in this organization" />
        </Card>
      ) : (
        <Card className="divide-y divide-border">
          {orgMembers.map((m) => {
            const rec = recordFor(m.id);
            const late =
              rec &&
              lateMinutes(rec, expectation, settings.graceMinutes) > 0;
            return (
              <div key={m.id} className="flex flex-wrap items-center gap-3 p-3">
                <Avatar name={m.name} color={m.avatarColor} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.title}</p>
                </div>
                <Select
                  value={rec?.status ?? ""}
                  onValueChange={(v) =>
                    mark(m, v as AttendanceStatus, rec?.checkInTime ?? null)
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Mark…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="leave">Leave</SelectItem>
                  </SelectContent>
                </Select>
                <input
                  type="time"
                  disabled={rec?.status !== "present"}
                  value={rec?.checkInTime ?? ""}
                  onChange={(e) => mark(m, "present", e.target.value)}
                  className={cn(
                    "h-9 rounded-lg border border-input bg-card px-2 text-sm shadow-sm disabled:opacity-50",
                    late && "border-destructive text-destructive"
                  )}
                />
                {late && (
                  <span className="text-xs font-semibold text-destructive">
                    +{fmtLate(lateMinutes(rec!, expectation, settings.graceMinutes))}
                  </span>
                )}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

/* ============================== Late report ============================== */
export function LateReport({
  api,
  members,
  organizations,
  defaultOrg,
  lockOrg,
  scopeUserId,
}: {
  api: AttendanceApi;
  members: Member[];
  organizations: Organization[];
  defaultOrg: string;
  lockOrg: boolean;
  scopeUserId?: string;
}) {
  const [orgId, setOrgId] = useState(defaultOrg);
  const [from, setFrom] = useState("2026-05-01");
  const [to, setTo] = useState(TODAY);

  const memberName = (id: string) =>
    members.find((m) => m.id === id)?.name ?? "Unknown";

  const rows = useMemo(() => {
    const settings = settingsFor(api, orgId);
    const scopeIds = scopeUserId
      ? new Set([scopeUserId])
      : new Set(members.filter((m) => m.orgId === orgId).map((m) => m.id));
    return api.records
      .filter(
        (r) =>
          r.date >= from &&
          r.date <= to &&
          scopeIds.has(r.userId) &&
          r.status === "present"
      )
      .map((r) => {
        const exp = expectationForDate(r.date, settings, api.exemptions);
        return { r, late: lateMinutes(r, exp, settings.graceMinutes), exp };
      })
      .filter((x) => x.late > 0)
      .sort((a, b) => (a.r.date < b.r.date ? 1 : -1));
  }, [api, members, orgId, from, to, scopeUserId]);

  const summary = useMemo(() => {
    const map = new Map<string, { days: number; minutes: number }>();
    for (const { r, late } of rows) {
      const cur = map.get(r.userId) ?? { days: 0, minutes: 0 };
      cur.days += 1;
      cur.minutes += late;
      map.set(r.userId, cur);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].minutes - a[1].minutes);
  }, [rows]);

  function exportCsv() {
    const out: (string | number)[][] = [
      ["Member", "Date", "Expected", "Check-in", "Late"],
      ...rows.map(({ r, late, exp }) => [
        memberName(r.userId),
        r.date,
        exp.expectedTime ?? "",
        r.checkInTime ?? "",
        fmtLate(late),
      ]),
    ];
    downloadCsv(`late-report_${from}_to_${to}.csv`, out);
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        {!lockOrg && (
          <OrgPicker organizations={organizations} value={orgId} onChange={setOrgId} />
        )}
        <div className="flex items-center gap-2">
          <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          <span className="text-sm text-muted-foreground">to</span>
          <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0} className="sm:ml-auto">
          <Download className="h-4 w-4" />
          Download CSV
        </Button>
      </Card>

      {!scopeUserId && summary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Late summary</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {summary.map(([uid, s]) => (
              <div
                key={uid}
                className="flex items-center justify-between rounded-lg border border-border p-2.5"
              >
                <span className="text-sm font-medium">{memberName(uid)}</span>
                <span className="text-sm">
                  <span className="font-semibold text-destructive">
                    {s.days} day{s.days === 1 ? "" : "s"}
                  </span>{" "}
                  <span className="text-muted-foreground">· {fmtLate(s.minutes)}</span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={Clock} title="No late entries in this range" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  {!scopeUserId && <th className="px-4 py-2.5 text-left font-semibold">Member</th>}
                  <th className="px-4 py-2.5 text-left font-semibold">Date</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Expected</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Check-in</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Late</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map(({ r, late, exp }) => (
                  <tr key={r.id} className="hover:bg-accent/30">
                    {!scopeUserId && (
                      <td className="px-4 py-2.5 font-medium">{memberName(r.userId)}</td>
                    )}
                    <td className="px-4 py-2.5">{format(new Date(r.date + "T00:00:00"), "EEE, MMM d")}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{fmtTime(exp.expectedTime)}</td>
                    <td className="px-4 py-2.5 font-medium text-destructive">{fmtTime(r.checkInTime)}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-semibold text-destructive">+{fmtLate(late)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* =========================== Schedule settings =========================== */
export function ScheduleSettings({
  api,
  organizations,
  defaultOrg,
  lockOrg,
}: {
  api: AttendanceApi;
  organizations: Organization[];
  defaultOrg: string;
  lockOrg: boolean;
}) {
  const [orgId, setOrgId] = useState(defaultOrg);
  const existing = settingsFor(api, orgId);
  const [expectedTime, setExpectedTime] = useState(existing.expectedTime);
  const [grace, setGrace] = useState(existing.graceMinutes);
  const [workDays, setWorkDays] = useState<number[]>(existing.workDays);

  // exemption form
  const [exDate, setExDate] = useState("");
  const [exTime, setExTime] = useState("");
  const [exReason, setExReason] = useState("");

  const orgExemptions = api.exemptions.filter((e) => e.orgId === orgId);

  // Scrum cancellations form
  const { scrumCancellations, cancelScrumMeeting, restoreScrumMeeting } = useApp();
  const TIME_SLOTS = [
    "09:00 AM - 09:30 AM",
    "09:30 AM - 10:00 AM",
    "10:00 AM - 10:30 AM",
    "10:30 AM - 11:00 AM",
    "11:00 AM - 11:30 AM",
    "11:30 AM - 12:00 PM",
  ];
  const [scrumDate, setScrumDate] = useState("");
  const [scrumTimeSlot, setScrumTimeSlot] = useState(TIME_SLOTS[0]);
  const [scrumReason, setScrumReason] = useState("");

  const orgCancellations = scrumCancellations.filter((c) => c.org_id === orgId);

  async function addScrumCancel() {
    if (!scrumDate) {
      toast.error("Pick a date");
      return;
    }
    try {
      await cancelScrumMeeting(scrumDate, scrumTimeSlot, scrumReason || null);
      setScrumDate("");
      setScrumReason("");
      toast.success("Scrum meeting cancellation added");
    } catch (err) {
      toast.error((err as Error).message || "Failed to cancel meeting");
    }
  }

  async function deleteScrumCancel(timeSlot: string, date: string) {
    try {
      await restoreScrumMeeting(date, timeSlot);
      toast.success("Scrum meeting cancellation removed");
    } catch (err) {
      toast.error((err as Error).message || "Failed to remove cancellation");
    }
  }

  function toggleDay(d: number) {
    setWorkDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    );
  }

  async function save() {
    try {
      await api.saveSettings({ orgId, expectedTime, graceMinutes: grace, workDays });
      toast.success("Schedule saved");
    } catch (err) {
      toast.error((err as Error).message || "Failed to save");
    }
  }

  async function addEx() {
    if (!exDate) {
      toast.error("Pick a date");
      return;
    }
    try {
      await api.addExemption({
        orgId,
        date: exDate,
        expectedTime: exTime || null,
        reason: exReason || null,
      });
      setExDate("");
      setExTime("");
      setExReason("");
      toast.success("Exemption added");
    } catch (err) {
      toast.error((err as Error).message || "Failed to add");
    }
  }

  return (
    <div className="space-y-4">
      {!lockOrg && (
        <Card className="p-3">
          <OrgPicker
            organizations={organizations}
            value={orgId}
            onChange={(v) => {
              setOrgId(v);
              const s = settingsFor(api, v);
              setExpectedTime(s.expectedTime);
              setGrace(s.graceMinutes);
              setWorkDays(s.workDays);
            }}
          />
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Work schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Expected check-in time</Label>
              <Input
                type="time"
                value={expectedTime}
                onChange={(e) => setExpectedTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Grace period (minutes)</Label>
              <Input
                type="number"
                min={0}
                value={grace}
                onChange={(e) => setGrace(Number(e.target.value))}
              />
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Working days</Label>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((d, i) => (
                <button
                  key={d}
                  onClick={() => toggleDay(i)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                    workDays.includes(i)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={save}>Save schedule</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exemptions &amp; holidays</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={exDate} onChange={(e) => setExDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Alt. time (blank = day off)</Label>
              <Input type="time" value={exTime} onChange={(e) => setExTime(e.target.value)} className="w-32" />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">Reason</Label>
              <Input value={exReason} onChange={(e) => setExReason(e.target.value)} placeholder="Public holiday" />
            </div>
            <Button variant="outline" onClick={addEx}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>

          {orgExemptions.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No exemptions yet.
            </p>
          ) : (
            <div className="space-y-1.5">
              {orgExemptions.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-2.5"
                >
                  <Badge variant={e.expectedTime ? "info" : "warning"}>
                    {e.expectedTime ? fmtTime(e.expectedTime) : "Day off"}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {format(new Date(e.date + "T00:00:00"), "EEE, MMM d, yyyy")}
                    </p>
                    {e.reason && (
                      <p className="text-xs text-muted-foreground">{e.reason}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => api.deleteExemption(e.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CalendarX className="h-5 w-5 text-destructive" />
            Canceled Scrum Meetings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Date</Label>
              <Input
                type="date"
                value={scrumDate}
                onChange={(e) => setScrumDate(e.target.value)}
                className="w-40 bg-card"
              />
            </div>
            <div className="space-y-1.5 w-56">
              <Label className="text-xs font-semibold">Time Slot</Label>
              <Select value={scrumTimeSlot} onValueChange={setScrumTimeSlot}>
                <SelectTrigger className="w-full bg-card">
                  <SelectValue placeholder="Select slot..." />
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
            <div className="flex-1 min-w-[200px] space-y-1.5">
              <Label className="text-xs font-semibold">Reason (optional)</Label>
              <Input
                value={scrumReason}
                onChange={(e) => setScrumReason(e.target.value)}
                placeholder="e.g. Public Holiday, Team Day Out"
                className="bg-card"
              />
            </div>
            <Button variant="destructive" onClick={addScrumCancel}>
              <Plus className="h-4 w-4" />
              Cancel Meeting
            </Button>
          </div>

          {orgCancellations.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No meetings canceled yet.
            </p>
          ) : (
            <div className="space-y-2">
              {orgCancellations.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm hover:shadow transition-shadow"
                >
                  <Badge variant="destructive" className="font-semibold uppercase tracking-wider">
                    Canceled
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {format(new Date(c.date + "T00:00:00"), "EEE, MMM d, yyyy")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Time Slot: <span className="font-medium text-foreground">{c.time_slot}</span>
                      {c.reason && <span className="ml-1.5 text-muted-foreground">· Reason: &quot;{c.reason}&quot;</span>}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => deleteScrumCancel(c.time_slot, c.date)}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================ My attendance ============================= */
export function MyAttendance({
  api,
  member,
}: {
  api: AttendanceApi;
  member: Member;
}) {
  const settings = settingsFor(api, member.orgId ?? "");
  const mine = api.records
    .filter((r) => r.userId === member.id)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>My attendance</CardTitle>
        </CardHeader>
        {mine.length === 0 ? (
          <EmptyState icon={Clock} title="No attendance recorded yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-y border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5 text-left font-semibold">Date</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Status</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Check-in</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Late</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mine.map((r) => {
                  const exp = expectationForDate(r.date, settings, api.exemptions);
                  const late = lateMinutes(r, exp, settings.graceMinutes);
                  return (
                    <tr key={r.id} className="hover:bg-accent/30">
                      <td className="px-4 py-2.5">
                        {format(new Date(r.date + "T00:00:00"), "EEE, MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                            STATUS_META[r.status].className
                          )}
                        >
                          {STATUS_META[r.status].label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">{fmtTime(r.checkInTime)}</td>
                      <td className="px-4 py-2.5">
                        {late > 0 ? (
                          <span className="font-semibold text-destructive">
                            +{fmtLate(late)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

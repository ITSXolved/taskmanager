// Attendance domain types + late-calculation + CSV helpers.

export type AttendanceStatus = "present" | "absent" | "leave";

export interface AttendanceSettings {
  orgId: string;
  expectedTime: string; // "HH:MM"
  graceMinutes: number;
  workDays: number[]; // 0=Sun..6=Sat
}

export interface AttendanceExemption {
  id: string;
  orgId: string;
  date: string; // yyyy-MM-dd
  expectedTime: string | null; // null = full holiday
  reason: string | null;
}

export interface AttendanceRecord {
  id: string;
  orgId: string | null;
  userId: string;
  date: string; // yyyy-MM-dd
  status: AttendanceStatus;
  checkInTime: string | null; // "HH:MM"
  markedBy: string | null;
}

export const DEFAULT_SETTINGS: Omit<AttendanceSettings, "orgId"> = {
  expectedTime: "09:00",
  graceMinutes: 10,
  workDays: [1, 2, 3, 4, 5],
};

export const STATUS_META: Record<
  AttendanceStatus,
  { label: string; className: string }
> = {
  present: { label: "Present", className: "bg-success/10 text-success border-success/20" },
  absent: {
    label: "Absent",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  leave: {
    label: "Leave",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
};

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Normalise a stored time ("HH:MM:SS" or "HH:MM") to minutes since midnight. */
export function timeToMinutes(t?: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export function fmtTime(t?: string | null): string {
  const mins = timeToMinutes(t);
  if (mins === null) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const am = h < 12;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${am ? "AM" : "PM"}`;
}

export interface DayExpectation {
  exempt: boolean; // full holiday / non-work day
  expectedTime: string | null; // effective expected time for the day
  reason?: string | null;
}

/** The effective expected check-in time for a given date (considers exemptions & work days). */
export function expectationForDate(
  date: string,
  settings: AttendanceSettings | undefined,
  exemptions: AttendanceExemption[]
): DayExpectation {
  const ex = exemptions.find((e) => e.date === date);
  if (ex) {
    // An exemption with no time is a full day off; otherwise an alternate time.
    return { exempt: ex.expectedTime === null, expectedTime: ex.expectedTime, reason: ex.reason };
  }
  if (!settings) return { exempt: false, expectedTime: null };
  const dow = new Date(date + "T00:00:00").getDay();
  if (!settings.workDays.includes(dow))
    return { exempt: true, expectedTime: null, reason: "Non-working day" };
  return { exempt: false, expectedTime: settings.expectedTime };
}

/** Minutes late (0 if on time / not applicable). */
export function lateMinutes(
  record: AttendanceRecord,
  expectation: DayExpectation,
  graceMinutes: number
): number {
  if (record.status !== "present" || !record.checkInTime) return 0;
  if (expectation.exempt || !expectation.expectedTime) return 0;
  const checkIn = timeToMinutes(record.checkInTime);
  const expected = timeToMinutes(expectation.expectedTime);
  if (checkIn === null || expected === null) return 0;
  const diff = checkIn - (expected + graceMinutes);
  return diff > 0 ? diff : 0;
}

export function fmtLate(minutes: number): string {
  if (minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Build and download a CSV file in the browser. */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

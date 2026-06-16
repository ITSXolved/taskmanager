"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import {
  AttendanceExemptionRow,
  AttendanceRecordRow,
  AttendanceSettingsRow,
} from "@/lib/database.types";
import {
  AttendanceExemption,
  AttendanceRecord,
  AttendanceSettings,
  AttendanceStatus,
} from "@/lib/attendance";

const supabase = getSupabaseBrowser();

const mapSettings = (r: AttendanceSettingsRow): AttendanceSettings => ({
  orgId: r.org_id,
  expectedTime: (r.expected_time ?? "09:00").slice(0, 5),
  graceMinutes: r.grace_minutes,
  workDays: r.work_days ?? [1, 2, 3, 4, 5],
});

const mapExemption = (r: AttendanceExemptionRow): AttendanceExemption => ({
  id: r.id,
  orgId: r.org_id,
  date: r.date,
  expectedTime: r.expected_time ? r.expected_time.slice(0, 5) : null,
  reason: r.reason,
});

const mapRecord = (r: AttendanceRecordRow): AttendanceRecord => ({
  id: r.id,
  orgId: r.org_id,
  userId: r.user_id,
  date: r.date,
  status: r.status,
  checkInTime: r.check_in_time ? r.check_in_time.slice(0, 5) : null,
  markedBy: r.marked_by,
});

export function useAttendance(enabled: boolean, userId: string | null) {
  const qc = useQueryClient();

  const settingsQ = useQuery({
    queryKey: ["attendance-settings"],
    enabled,
    queryFn: async () => {
      const { data } = await supabase.from("attendance_settings").select("*");
      return (data ?? []).map(mapSettings);
    },
  });

  const exemptionsQ = useQuery({
    queryKey: ["attendance-exemptions"],
    enabled,
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance_exemptions")
        .select("*")
        .order("date", { ascending: false });
      return (data ?? []).map(mapExemption);
    },
  });

  const recordsQ = useQuery({
    queryKey: ["attendance-records"],
    enabled,
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance_records")
        .select("*")
        .order("date", { ascending: false });
      return (data ?? []).map(mapRecord);
    },
  });

  useEffect(() => {
    if (!enabled) return;
    const ch = supabase
      .channel("attendance-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance_records" },
        () => qc.invalidateQueries({ queryKey: ["attendance-records"] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [enabled, qc]);

  async function markAttendance(input: {
    userId: string;
    orgId: string | null;
    date: string;
    status: AttendanceStatus;
    checkInTime: string | null;
  }) {
    const { error } = await supabase.from("attendance_records").upsert(
      {
        user_id: input.userId,
        org_id: input.orgId,
        date: input.date,
        status: input.status,
        check_in_time: input.status === "present" ? input.checkInTime : null,
        marked_by: userId,
      },
      { onConflict: "user_id,date" }
    );
    if (error) throw new Error(error.message);
    qc.invalidateQueries({ queryKey: ["attendance-records"] });
  }

  async function saveSettings(s: AttendanceSettings) {
    const { error } = await supabase.from("attendance_settings").upsert(
      {
        org_id: s.orgId,
        expected_time: s.expectedTime,
        grace_minutes: s.graceMinutes,
        work_days: s.workDays,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "org_id" }
    );
    if (error) throw new Error(error.message);
    qc.invalidateQueries({ queryKey: ["attendance-settings"] });
  }

  async function addExemption(input: {
    orgId: string;
    date: string;
    expectedTime: string | null;
    reason: string | null;
  }) {
    const { error } = await supabase.from("attendance_exemptions").upsert(
      {
        org_id: input.orgId,
        date: input.date,
        expected_time: input.expectedTime,
        reason: input.reason,
        created_by: userId,
      },
      { onConflict: "org_id,date" }
    );
    if (error) throw new Error(error.message);
    qc.invalidateQueries({ queryKey: ["attendance-exemptions"] });
  }

  async function deleteExemption(id: string) {
    await supabase.from("attendance_exemptions").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["attendance-exemptions"] });
  }

  return {
    settings: settingsQ.data ?? [],
    exemptions: exemptionsQ.data ?? [],
    records: recordsQ.data ?? [],
    loading: settingsQ.isLoading || recordsQ.isLoading,
    markAttendance,
    saveSettings,
    addExemption,
    deleteExemption,
  };
}

"use client";

import { CalendarClock, ListChecks, Settings } from "lucide-react";
import { useApp } from "@/lib/store";
import { useAttendance } from "@/lib/use-attendance";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MarkAttendance,
  LateReport,
  ScheduleSettings,
  MyAttendance,
} from "@/components/attendance/panels";

export default function AttendancePage() {
  const { currentUser, isAdmin, organizations, members } = useApp();
  const api = useAttendance(!!currentUser, currentUser?.id ?? null);

  if (!currentUser) return null;

  if (!isAdmin) {
    // Member self-view: own records + own late report.
    const defaultOrg = currentUser.orgId ?? "";
    return (
      <div>
        <PageHeader title="Attendance" />
        <Tabs defaultValue="mine">
          <TabsList>
            <TabsTrigger value="mine">
              <ListChecks /> My Attendance
            </TabsTrigger>
            <TabsTrigger value="late">
              <CalendarClock /> My Late Report
            </TabsTrigger>
          </TabsList>
          <TabsContent value="mine">
            <MyAttendance api={api} member={currentUser} />
          </TabsContent>
          <TabsContent value="late">
            <LateReport
              api={api}
              members={[currentUser]}
              organizations={organizations}
              defaultOrg={defaultOrg}
              lockOrg
              scopeUserId={currentUser.id}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Admin / super admin
  const isSuper = currentUser.role === "super_admin";
  const defaultOrg = isSuper
    ? organizations[0]?.id ?? ""
    : currentUser.orgId ?? "";

  return (
    <div>
      <PageHeader title="Attendance" />
      <Tabs defaultValue="mark">
        <TabsList>
          <TabsTrigger value="mark">
            <ListChecks /> Take Attendance
          </TabsTrigger>
          <TabsTrigger value="late">
            <CalendarClock /> Late Report
          </TabsTrigger>
          <TabsTrigger value="schedule">
            <Settings /> Schedule
          </TabsTrigger>
        </TabsList>
        <TabsContent value="mark">
          <MarkAttendance
            api={api}
            members={members}
            organizations={organizations}
            defaultOrg={defaultOrg}
            lockOrg={!isSuper}
          />
        </TabsContent>
        <TabsContent value="late">
          <LateReport
            api={api}
            members={members}
            organizations={organizations}
            defaultOrg={defaultOrg}
            lockOrg={!isSuper}
          />
        </TabsContent>
        <TabsContent value="schedule">
          <ScheduleSettings
            api={api}
            organizations={organizations}
            defaultOrg={defaultOrg}
            lockOrg={!isSuper}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

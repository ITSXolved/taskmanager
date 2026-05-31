"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import {
  useQuery,
  useQueryClient,
  QueryClient,
} from "@tanstack/react-query";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import {
  mapMember,
  mapTask,
  mapProject,
  mapNotification,
  mapActivity,
} from "@/lib/mappers";
import {
  ActivityEntry,
  AppNotification,
  Member,
  Project,
  Role,
  Task,
  TaskStatus,
  Priority,
} from "@/lib/types";
import {
  ActivityLogRow,
  NotificationRow,
  ProfileRow,
  ProjectRow,
  TaskRow,
} from "@/lib/database.types";

const supabase = getSupabaseBrowser();

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority: Priority;
  status: TaskStatus;
  dueDate?: string | null;
  projectId?: string | null;
  assigneeIds: string[];
  categoryNames?: string[];
}

export interface CreateProjectInput {
  title: string;
  description?: string;
  status: Project["status"];
  deadline?: string | null;
}

interface AppState {
  ready: boolean;
  currentUser: Member | null;
  role: Role;
  actualRole: Role;
  isAdmin: boolean;
  canSwitchRole: boolean;
  switchRole: (role: Role) => void;
  members: Member[];
  tasks: Task[];
  projects: Project[];
  notifications: AppNotification[];
  unreadCount: number;
  trend: { date: string; completed: number; created: number }[];
  activity: ActivityEntry[];
  getMember: (id: string) => Member | undefined;
  // actions
  createTask: (input: CreateTaskInput) => Promise<void>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  moveTask: (id: string, status: TaskStatus) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addComment: (taskId: string, body: string, mentions: string[]) => Promise<void>;
  addAttachment: (taskId: string, file: File) => Promise<void>;
  removeAttachment: (id: string, path?: string) => Promise<void>;
  createProject: (input: CreateProjectInput) => Promise<void>;
  refreshMembers: () => void;
  markNotificationRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [viewAs, setViewAs] = useState<Role | null>(null);

  // ---- Auth + profile -----------------------------------------------------
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async (): Promise<ProfileRow | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      return data;
    },
  });

  // React to auth changes so a new login never shows the previous session's
  // cached profile/data (wrong role, stale workspace).
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setViewAs(null); // never carry an admin's "view as" across sessions
        qc.clear();
      } else if (event === "SIGNED_IN") {
        setViewAs(null); // always start a fresh login in the real role
        qc.invalidateQueries();
      } else {
        // INITIAL_SESSION, TOKEN_REFRESHED, USER_UPDATED
        qc.invalidateQueries();
      }
    });
    return () => subscription.unsubscribe();
  }, [qc]);

  const userId = profile?.id ?? null;
  const enabled = !!userId;

  // ---- Members ------------------------------------------------------------
  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    enabled,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("name");
      return (data ?? []).map(mapMember);
    },
  });

  // ---- Tasks (with nested relations) --------------------------------------
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    enabled,
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select(
          `*, task_assignees(user_id), task_categories(categories(name)),
           comments(*), attachments(*), activity_logs(*)`
        )
        .order("created_at", { ascending: false });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((t: any) => mapTask(t));
    },
  });

  // ---- Projects -----------------------------------------------------------
  const { data: projectRows = [] } = useQuery({
    queryKey: ["projects"],
    enabled,
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      return (data ?? []) as ProjectRow[];
    },
  });

  // ---- Notifications ------------------------------------------------------
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    enabled,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });
      return (data ?? []).map((n: NotificationRow) => mapNotification(n));
    },
  });

  // ---- Completion trend (RPC) ---------------------------------------------
  const { data: trend = [] } = useQuery({
    queryKey: ["trend"],
    enabled,
    queryFn: async () => {
      const { data } = await supabase.rpc("get_completion_trend", { _days: 30 });
      return (data ?? []).map((d: { day: string; completed: number; created: number }) => ({
        date: d.day.slice(5),
        completed: Number(d.completed),
        created: Number(d.created),
      }));
    },
  });

  // ---- Recent activity feed -----------------------------------------------
  const { data: activity = [] } = useQuery({
    queryKey: ["activity"],
    enabled,
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8);
      return (data ?? []).map((a: ActivityLogRow) => mapActivity(a));
    },
  });

  // Derive project members from task assignees of each project.
  const projects: Project[] = useMemo(
    () =>
      projectRows.map((p) => {
        const ids = new Set<string>();
        if (p.owner_id) ids.add(p.owner_id);
        tasks
          .filter((t) => t.projectId === p.id)
          .forEach((t) => t.assigneeIds.forEach((id) => ids.add(id)));
        return mapProject(p, Array.from(ids));
      }),
    [projectRows, tasks]
  );

  const currentUser = useMemo(
    () => (profile ? mapMember(profile) : null),
    [profile]
  );

  // Actual role from the profile vs. the role the admin is currently *viewing*.
  // Only real admins may preview the member view; members are locked to "user".
  const actualRole: Role = profile?.role ?? "user";
  const canSwitchRole = actualRole === "admin";
  const role: Role = canSwitchRole ? viewAs ?? "admin" : "user";
  const isAdmin = role === "admin";
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Reset the view override whenever the signed-in account changes.
  useEffect(() => {
    setViewAs(null);
  }, [profile?.id]);

  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members]
  );

  // ---- Realtime -----------------------------------------------------------
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("teamflow-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => {
          qc.invalidateQueries({ queryKey: ["tasks"] });
          qc.invalidateQueries({ queryKey: ["trend"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments" },
        () => qc.invalidateQueries({ queryKey: ["tasks"] })
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_logs" },
        () => qc.invalidateQueries({ queryKey: ["activity"] })
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => qc.invalidateQueries({ queryKey: ["notifications"] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  // ---- Actions ------------------------------------------------------------
  async function createTask(input: CreateTaskInput) {
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title: input.title,
        description: input.description ?? null,
        priority: input.priority,
        status: input.status,
        due_date: input.dueDate ?? null,
        project_id: input.projectId ?? null,
        created_by: userId,
      })
      .select("id")
      .single();
    if (error || !data) throw error;

    if (input.assigneeIds.length) {
      await supabase.from("task_assignees").insert(
        input.assigneeIds.map((uid) => ({ task_id: data.id, user_id: uid }))
      );
    }
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }

  async function updateTask(id: string, patch: Partial<Task>) {
    const db: Partial<TaskRow> = {};
    if (patch.title !== undefined) db.title = patch.title;
    if (patch.description !== undefined) db.description = patch.description;
    if (patch.status !== undefined) db.status = patch.status;
    if (patch.priority !== undefined) db.priority = patch.priority;
    if (patch.dueDate !== undefined) db.due_date = patch.dueDate;
    if (patch.blocked !== undefined) db.is_blocked = patch.blocked;
    if (patch.projectId !== undefined) db.project_id = patch.projectId;
    await supabase.from("tasks").update(db).eq("id", id);
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }

  async function moveTask(id: string, status: TaskStatus) {
    // optimistic
    qc.setQueryData<Task[]>(["tasks"], (old) =>
      (old ?? []).map((t) => (t.id === id ? { ...t, status } : t))
    );
    await supabase.from("tasks").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }

  async function deleteTask(id: string) {
    await supabase.from("tasks").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }

  async function addComment(taskId: string, body: string, mentions: string[]) {
    await supabase
      .from("comments")
      .insert({ task_id: taskId, user_id: userId, content: body, mentions });
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }

  async function addAttachment(taskId: string, file: File) {
    const path = `${taskId}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage
      .from("attachments")
      .upload(path, file);
    if (upErr) throw upErr;
    await supabase.from("attachments").insert({
      task_id: taskId,
      file_url: path,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      uploaded_by: userId,
    });
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }

  async function removeAttachment(id: string, path?: string) {
    if (path) await supabase.storage.from("attachments").remove([path]);
    await supabase.from("attachments").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }

  async function createProject(input: CreateProjectInput) {
    await supabase.from("projects").insert({
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      deadline: input.deadline ?? null,
      owner_id: userId,
      created_by: userId,
    });
    qc.invalidateQueries({ queryKey: ["projects"] });
  }

  function refreshMembers() {
    qc.invalidateQueries({ queryKey: ["members"] });
  }

  async function markNotificationRead(id: string) {
    qc.setQueryData<AppNotification[]>(["notifications"], (old) =>
      (old ?? []).map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  }

  async function markAllRead() {
    qc.setQueryData<AppNotification[]>(["notifications"], (old) =>
      (old ?? []).map((n) => ({ ...n, read: true }))
    );
    if (userId)
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    qc.clear();
  }

  const value: AppState = {
    ready: !!profile,
    currentUser,
    role,
    actualRole,
    isAdmin,
    canSwitchRole,
    switchRole: (r: Role) => {
      if (canSwitchRole) setViewAs(r);
    },
    members,
    tasks,
    projects,
    notifications,
    unreadCount,
    trend,
    activity,
    getMember: (id) => memberMap.get(id),
    createTask,
    updateTask,
    moveTask,
    deleteTask,
    addComment,
    addAttachment,
    removeAttachment,
    createProject,
    refreshMembers,
    markNotificationRead,
    markAllRead,
    signOut,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export { QueryClient };

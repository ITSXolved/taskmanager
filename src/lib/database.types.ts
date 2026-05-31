// Hand-written types mirroring the Phase 2 schema.
// Regenerate anytime with: supabase gen types typescript --linked > src/lib/database.types.ts

export type Role = "super_admin" | "admin" | "user";
export type DbPriority = "critical" | "high" | "medium" | "low";
export type DbTaskStatus = "not_started" | "in_progress" | "in_review" | "done";
export type DbProjectStatus = "planning" | "active" | "on_hold" | "completed";
export type DbNotificationType =
  | "task_assigned"
  | "comment"
  | "mention"
  | "due_soon"
  | "status_change"
  | "project";

export type ProfileRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar_url: string | null;
  title: string | null;
  phone: string | null;
  org_id: string | null;
  manager_id: string | null;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
}

export type OrganizationRow = {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
}

export type ProjectRow = {
  id: string;
  title: string;
  description: string | null;
  owner_id: string | null;
  status: DbProjectStatus;
  deadline: string | null;
  created_by: string | null;
  created_at: string;
}

export type TaskRow = {
  id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  priority: DbPriority;
  status: DbTaskStatus;
  is_blocked: boolean;
  due_date: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskAssigneeRow = {
  id: string;
  task_id: string;
  user_id: string;
  assigned_at: string;
}

export type CategoryRow = {
  id: string;
  name: string;
  color: string;
  created_by: string | null;
  created_at: string;
}

export type CommentRow = {
  id: string;
  task_id: string;
  user_id: string | null;
  content: string;
  mentions: string[];
  created_at: string;
  updated_at: string;
}

export type AttachmentRow = {
  id: string;
  task_id: string;
  file_url: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export type ActivityLogRow = {
  id: string;
  task_id: string | null;
  project_id: string | null;
  actor_id: string | null;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type NotificationRow = {
  id: string;
  user_id: string;
  type: DbNotificationType;
  title: string;
  payload: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export type DashboardStats = {
  total: number;
  completed: number;
  in_progress: number;
  overdue: number;
  completed_today: number;
  due_today: number;
  completion_rate: number;
}

type Row<T> = {
  Row: T;
  Insert: Partial<T>;
  Update: Partial<T>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Row<ProfileRow>;
      organizations: Row<OrganizationRow>;
      projects: Row<ProjectRow>;
      tasks: Row<TaskRow>;
      task_assignees: Row<TaskAssigneeRow>;
      categories: Row<CategoryRow>;
      task_categories: Row<{ task_id: string; category_id: string }>;
      comments: Row<CommentRow>;
      attachments: Row<AttachmentRow>;
      activity_logs: Row<ActivityLogRow>;
      notifications: Row<NotificationRow>;
    };
    Views: {
      scrum_daily_summary: {
        Row: {
          member_id: string;
          member_name: string;
          avatar_url: string | null;
          done: number;
          in_progress: number;
          blocked: number;
        };
        Relationships: [];
      };
      project_progress: {
        Row: {
          id: string;
          title: string;
          status: DbProjectStatus;
          deadline: string | null;
          task_count: number;
          completed_count: number;
          progress: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      get_dashboard_stats: {
        Args: { _user_id: string; _role: string };
        Returns: DashboardStats;
      };
      get_completion_trend: {
        Args: { _days: number };
        Returns: { day: string; completed: number; created: number }[];
      };
    };
    Enums: {
      user_role: Role;
      task_priority: DbPriority;
      task_status: DbTaskStatus;
      project_status: DbProjectStatus;
      notification_type: DbNotificationType;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Role = "admin" | "user";

export type Priority = "critical" | "high" | "medium" | "low";

export type TaskStatus =
  | "not_started"
  | "in_progress"
  | "in_review"
  | "done";

export type ProjectStatus = "planning" | "active" | "on_hold" | "completed";

export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  avatarColor: string;
  title: string;
  joinedAt: string;
  phone?: string | null;
}

export interface Comment {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
  mentions: string[];
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  path?: string; // storage object path inside the 'attachments' bucket
}

export interface ActivityEntry {
  id: string;
  actorId: string;
  action: string;
  target?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assigneeIds: string[];
  projectId: string | null;
  categories: string[];
  dueDate: string;
  createdAt: string;
  completedAt: string | null;
  blocked: boolean;
  comments: Comment[];
  attachments: Attachment[];
  activity: ActivityEntry[];
}

export interface Milestone {
  id: string;
  name: string;
  date: string;
  done: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  ownerId: string;
  memberIds: string[];
  deadline: string;
  createdAt: string;
  milestones: Milestone[];
}

export type NotificationType =
  | "task_assigned"
  | "comment"
  | "mention"
  | "due_soon"
  | "status_change"
  | "project";

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  createdAt: string;
  read: boolean;
  actorId?: string;
}

export const PRIORITY_META: Record<
  Priority,
  { label: string; dot: string; className: string }
> = {
  critical: {
    label: "Critical",
    dot: "bg-destructive",
    className:
      "bg-destructive/10 text-destructive border-destructive/20",
  },
  high: {
    label: "High",
    dot: "bg-orange-500",
    className:
      "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  },
  medium: {
    label: "Medium",
    dot: "bg-amber-500",
    className:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  low: {
    label: "Low",
    dot: "bg-emerald-500",
    className:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
};

export const STATUS_META: Record<
  TaskStatus,
  { label: string; className: string; accent: string }
> = {
  not_started: {
    label: "Not Started",
    className: "bg-muted text-muted-foreground border-border",
    accent: "hsl(var(--muted-foreground))",
  },
  in_progress: {
    label: "In Progress",
    className:
      "bg-info/10 text-info border-info/20",
    accent: "hsl(var(--info))",
  },
  in_review: {
    label: "In Review",
    className:
      "bg-chart-4/10 text-chart-4 border-chart-4/20",
    accent: "hsl(var(--chart-4))",
  },
  done: {
    label: "Done",
    className: "bg-success/10 text-success border-success/20",
    accent: "hsl(var(--success))",
  },
};

export const PROJECT_STATUS_META: Record<
  ProjectStatus,
  { label: string; className: string }
> = {
  planning: {
    label: "Planning",
    className: "bg-muted text-muted-foreground border-border",
  },
  active: {
    label: "Active",
    className: "bg-info/10 text-info border-info/20",
  },
  on_hold: {
    label: "On Hold",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  completed: {
    label: "Completed",
    className: "bg-success/10 text-success border-success/20",
  },
};

export const TASK_COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "not_started", label: "Not Started" },
  { id: "in_progress", label: "In Progress" },
  { id: "in_review", label: "In Review" },
  { id: "done", label: "Done" },
];

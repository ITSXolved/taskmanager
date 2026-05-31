import { stringToHue } from "./utils";
import {
  ActivityLogRow,
  AttachmentRow,
  CommentRow,
  NotificationRow,
  ProfileRow,
  ProjectRow,
  TaskRow,
} from "./database.types";
import {
  ActivityEntry,
  AppNotification,
  Attachment,
  Comment,
  Member,
  Project,
  Task,
} from "./types";

export const avatarColorFor = (id: string) => `${stringToHue(id)} 68% 52%`;

export function mapMember(p: ProfileRow): Member {
  return {
    id: p.id,
    name: p.name,
    email: p.email,
    role: p.role,
    active: p.is_active,
    avatarColor: avatarColorFor(p.id),
    title: p.title ?? "Team Member",
    joinedAt: p.created_at,
    phone: p.phone,
  };
}

interface TaskJoin extends TaskRow {
  task_assignees?: { user_id: string }[];
  task_categories?: { categories: { name: string } | null }[];
  comments?: CommentRow[];
  attachments?: AttachmentRow[];
  activity_logs?: ActivityLogRow[];
}

export function mapComment(c: CommentRow): Comment {
  return {
    id: c.id,
    authorId: c.user_id ?? "",
    body: c.content,
    createdAt: c.created_at,
    mentions: c.mentions ?? [],
  };
}

export function mapAttachment(a: AttachmentRow): Attachment {
  return {
    id: a.id,
    name: a.file_name,
    size: a.file_size ?? 0,
    type: (a.file_type ?? a.file_name.split(".").pop() ?? "file").toLowerCase(),
    uploadedAt: a.created_at,
    path: a.file_url,
  };
}

export function mapActivity(a: ActivityLogRow): ActivityEntry {
  const meta = a.metadata as { title?: string; to?: string };
  return {
    id: a.id,
    actorId: a.actor_id ?? "",
    action: a.action,
    target: meta?.title,
    createdAt: a.created_at,
  };
}

export function mapTask(t: TaskJoin): Task {
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? "",
    status: t.status,
    priority: t.priority,
    assigneeIds: (t.task_assignees ?? []).map((a) => a.user_id),
    projectId: t.project_id,
    categories: (t.task_categories ?? [])
      .map((tc) => tc.categories?.name)
      .filter((n): n is string => !!n),
    dueDate: t.due_date ?? t.created_at,
    createdAt: t.created_at,
    completedAt: t.completed_at,
    blocked: t.is_blocked,
    comments: (t.comments ?? [])
      .map(mapComment)
      .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    attachments: (t.attachments ?? []).map(mapAttachment),
    activity: (t.activity_logs ?? [])
      .map(mapActivity)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
  };
}

export function mapProject(p: ProjectRow, memberIds: string[]): Project {
  return {
    id: p.id,
    name: p.title,
    description: p.description ?? "",
    status: p.status,
    ownerId: p.owner_id ?? "",
    memberIds,
    deadline: p.deadline ?? p.created_at,
    createdAt: p.created_at,
    milestones: [], // no milestones table in the backend schema
  };
}

export function mapNotification(n: NotificationRow): AppNotification {
  const payload = n.payload as { actor_id?: string };
  return {
    id: n.id,
    type: n.type,
    message: n.title,
    createdAt: n.created_at,
    read: n.is_read,
    actorId: payload?.actor_id,
  };
}

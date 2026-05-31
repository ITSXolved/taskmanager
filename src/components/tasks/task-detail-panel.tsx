"use client";

import { useRef, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  MessageSquare,
  Paperclip,
  Send,
  Tag,
  Upload,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/misc";
import { RichTextEditor } from "@/components/shared/rich-text-editor";
import { CommentBubble } from "@/components/shared/comment-bubble";
import { FileAttachmentRow } from "@/components/shared/file-row";
import { PriorityBadge } from "@/components/shared/badges";
import { AvatarGroup } from "@/components/shared/avatar-group";
import { useApp } from "@/lib/store";
import {
  Priority,
  PRIORITY_META,
  Task,
  TaskStatus,
  STATUS_META,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function TaskDetailPanel({
  task,
  open,
  onOpenChange,
}: {
  task: Task | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const {
    isAdmin,
    members,
    projects,
    getMember,
    updateTask,
    addComment,
    addAttachment,
    removeAttachment,
  } = useApp();
  const [tab, setTab] = useState<"comments" | "activity">("comments");
  const [comment, setComment] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  if (!task) return null;
  const assignees = members.filter((m) => task.assigneeIds.includes(m.id));

  async function handleComment() {
    if (!comment.trim() || !task) return;
    const mentions = members
      .filter((m) => comment.includes(`@${m.name}`))
      .map((m) => m.id);
    try {
      await addComment(task.id, comment, mentions);
      setComment("");
      toast.success("Comment added");
    } catch {
      toast.error("Failed to add comment");
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !task) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File exceeds the 50MB limit");
      return;
    }
    try {
      await addAttachment(task.id, file);
      toast.success("File uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent side="right" className="flex flex-col p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-border px-5 py-4">
          <div className="flex flex-wrap items-center gap-2 pr-8">
            <PriorityBadge priority={task.priority} />
            {task.blocked && (
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-destructive">
                Blocked
              </span>
            )}
            {task.projectId && (
              <span className="text-xs text-muted-foreground">
                in {projects.find((p) => p.id === task.projectId)?.name ?? "Project"}
              </span>
            )}
          </div>
          <DialogTitle className="text-left text-xl leading-snug">
            {task.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {/* Properties grid */}
          <div className="grid grid-cols-2 gap-4">
            <Field icon={CheckCircle2} label="Status">
              <Select
                value={task.status}
                onValueChange={(v) =>
                  updateTask(task.id, { status: v as TaskStatus })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_META) as TaskStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_META[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field icon={Activity} label="Priority">
              <Select
                value={task.priority}
                onValueChange={(v) =>
                  updateTask(task.id, { priority: v as Priority })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORITY_META) as Priority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_META[p].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field icon={CalendarDays} label="Due date">
              <Input
                type="date"
                className="h-9"
                value={format(new Date(task.dueDate), "yyyy-MM-dd")}
                onChange={(e) =>
                  updateTask(task.id, {
                    dueDate: new Date(e.target.value).toISOString(),
                  })
                }
              />
            </Field>

            <Field icon={Users} label="Assignees">
              <div className="flex h-9 items-center gap-2">
                <AvatarGroup members={assignees} size="sm" max={4} />
                {isAdmin && (
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                    + Add
                  </Button>
                )}
              </div>
            </Field>
          </div>

          {/* Categories */}
          <div>
            <FieldLabel icon={Tag}>Category tags</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {task.categories.map((c) => (
                <span
                  key={c}
                  className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div>
            <FieldLabel>Description</FieldLabel>
            <RichTextEditor
              content={`<p>${task.description}</p>`}
              placeholder="Add a description…"
            />
          </div>

          {/* Attachments */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <FieldLabel icon={Paperclip} className="mb-0">
                Attachments ({task.attachments.length})
              </FieldLabel>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInput.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" />
                Upload
              </Button>
              <input
                ref={fileInput}
                type="file"
                className="hidden"
                accept="image/*,.pdf,.docx,.xlsx,.txt,.zip"
                onChange={handleUpload}
              />
            </div>
            <div className="space-y-2">
              {task.attachments.length === 0 ? (
                <button
                  onClick={() => fileInput.current?.click()}
                  className="w-full rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  Click to upload a file (max 50MB)
                </button>
              ) : (
                task.attachments.map((f) => (
                  <FileAttachmentRow
                    key={f.id}
                    file={f}
                    onDelete={async () => {
                      await removeAttachment(f.id, f.path);
                      toast.success("Attachment removed");
                    }}
                  />
                ))
              )}
            </div>
          </div>

          <Separator />

          {/* Comments / Activity tabs */}
          <div>
            <div className="mb-3 flex items-center gap-1 rounded-lg bg-muted p-1">
              <button
                onClick={() => setTab("comments")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors",
                  tab === "comments"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                <MessageSquare className="h-4 w-4" />
                Comments ({task.comments.length})
              </button>
              <button
                onClick={() => setTab("activity")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors",
                  tab === "activity"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                <Activity className="h-4 w-4" />
                Activity
              </button>
            </div>

            {tab === "comments" ? (
              <div className="space-y-3">
                {task.comments.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No comments yet. Start the conversation.
                  </p>
                ) : (
                  task.comments.map((c) => (
                    <CommentBubble key={c.id} comment={c} />
                  ))
                )}
              </div>
            ) : (
              <div className="relative space-y-4 before:absolute before:left-[15px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
                {task.activity.map((a) => {
                  const actor = getMember(a.actorId);
                  return (
                    <div key={a.id} className="relative flex items-start gap-3">
                      <Avatar
                        name={actor?.name ?? "?"}
                        color={actor?.avatarColor}
                        size="sm"
                        className="z-10"
                      />
                      <div className="pt-1">
                        <p className="text-sm">
                          <span className="font-semibold">{actor?.name}</span>{" "}
                          <span className="text-muted-foreground">
                            {a.action}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(a.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Comment composer */}
        {tab === "comments" && (
          <div className="border-t border-border p-4">
            <div className="flex items-end gap-2">
              <Input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleComment()}
                placeholder="Write a comment… use @ to mention"
              />
              <Button
                size="icon"
                onClick={handleComment}
                disabled={!comment.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FieldLabel({
  icon: Icon,
  children,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
        className
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </p>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <FieldLabel icon={Icon}>{label}</FieldLabel>
      {children}
    </div>
  );
}

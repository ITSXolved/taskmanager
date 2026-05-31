"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ListPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/shared/rich-text-editor";
import { useApp } from "@/lib/store";
import {
  Priority,
  PRIORITY_META,
  TaskStatus,
  STATUS_META,
} from "@/lib/types";

export function CreateTaskDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { createTask, members, projects, isAdmin, currentUser } = useApp();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [status, setStatus] = useState<TaskStatus>("not_started");
  const [assignee, setAssignee] = useState(currentUser?.id ?? "");
  const [projectId, setProjectId] = useState<string>("");
  const [due, setDue] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setTitle("");
    setPriority("medium");
    setStatus("not_started");
    setDue("");
    setDesc("");
  }

  async function handleCreate() {
    if (!title.trim()) {
      toast.error("Task title is required");
      return;
    }
    const assigneeId = isAdmin ? assignee : currentUser?.id;
    setSaving(true);
    try {
      await createTask({
        title,
        description: desc || undefined,
        priority,
        status,
        dueDate: due ? new Date(due).toISOString() : null,
        projectId: projectId || null,
        assigneeIds: assigneeId ? [assigneeId] : [],
      });
      toast.success("Task created");
      reset();
      onOpenChange(false);
    } catch {
      toast.error("Failed to create task");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent side="right" className="flex flex-col p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ListPlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Create Task</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement login flow"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <RichTextEditor
              onChange={setDesc}
              placeholder="Describe the task, acceptance criteria…"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger>
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
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger>
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
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Due date</Label>
              <Input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isAdmin && (
            <div className="space-y-1.5">
              <Label>Assignee</Label>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {members
                    .filter((m) => m.active)
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border p-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} loading={saving}>
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

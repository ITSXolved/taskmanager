"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { KanbanSquare, List, Plus, SlidersHorizontal, Inbox } from "lucide-react";
import { useApp } from "@/lib/store";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { FilterChipGroup } from "@/components/shared/filter-chips";
import { PriorityBadge, StatusChip } from "@/components/shared/badges";
import { AvatarGroup } from "@/components/shared/avatar-group";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Column, DataTable } from "@/components/shared/data-table";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { TaskDetailPanel } from "@/components/tasks/task-detail-panel";
import { CreateTaskDrawer } from "@/components/tasks/create-task-drawer";
import { Priority, PRIORITY_META, Task, TaskStatus, STATUS_META } from "@/lib/types";
import { isOverdue } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const priorityRank: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export default function TasksPage() {
  const { tasks, members, isAdmin, currentUser } = useApp();
  const [view, setView] = useState<"list" | "board">("board");
  const [search, setSearch] = useState("");
  const [priorities, setPriorities] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const scoped = useMemo(
    () =>
      isAdmin
        ? tasks
        : tasks.filter((t) => t.assigneeIds.includes(currentUser?.id ?? "")),
    [tasks, isAdmin, currentUser?.id]
  );

  const filtered = useMemo(() => {
    return scoped.filter((t) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (priorities.length && !priorities.includes(t.priority)) return false;
      if (statuses.length && !statuses.includes(t.status)) return false;
      return true;
    });
  }, [scoped, search, priorities, statuses]);

  function openTask(t: Task) {
    setSelected(t);
    setDetailOpen(true);
  }

  const columns: Column<Task>[] = [
    {
      key: "title",
      header: "Task",
      sortable: true,
      sortValue: (t) => t.title,
      render: (t) => (
        <div className="min-w-0">
          <p className="line-clamp-1 font-medium">{t.title}</p>
          <p className="text-xs text-muted-foreground">
            {t.categories.join(", ")}
          </p>
        </div>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      sortable: true,
      sortValue: (t) => priorityRank[t.priority],
      render: (t) => <PriorityBadge priority={t.priority} />,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (t) => t.status,
      render: (t) => <StatusChip status={t.status} />,
    },
    {
      key: "assignees",
      header: "Assignees",
      render: (t) => (
        <AvatarGroup
          members={members.filter((m) => t.assigneeIds.includes(m.id))}
          size="xs"
        />
      ),
    },
    {
      key: "due",
      header: "Due Date",
      sortable: true,
      sortValue: (t) => new Date(t.dueDate).getTime(),
      render: (t) => (
        <span
          className={cn(
            "text-sm",
            isOverdue(t) && "font-medium text-destructive"
          )}
        >
          {format(new Date(t.dueDate), "MMM d, yyyy")}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={isAdmin ? "Tasks" : "My Tasks"}
        actions={
          <>
            <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
              <button
                onClick={() => setView("board")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                  view === "board"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <KanbanSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Board</span>
              </button>
              <button
                onClick={() => setView("list")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                  view === "list"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Task</span>
            </Button>
          </>
        }
      />

      {/* Filter bar */}
      <Card className="mb-5 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search tasks…"
            className="sm:max-w-xs"
          />
          <div className="flex-1" />
          <Button
            variant={showFilters ? "subtle" : "outline"}
            size="sm"
            onClick={() => setShowFilters((s) => !s)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {priorities.length + statuses.length > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                {priorities.length + statuses.length}
              </span>
            )}
          </Button>
        </div>
        {showFilters && (
          <div className="mt-3 space-y-3 border-t border-border pt-3 animate-fade-in">
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Priority
              </p>
              <FilterChipGroup
                options={(Object.keys(PRIORITY_META) as Priority[]).map((p) => ({
                  value: p,
                  label: PRIORITY_META[p].label,
                }))}
                selected={priorities}
                onToggle={(v) => toggle(priorities, setPriorities, v)}
              />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </p>
              <FilterChipGroup
                options={(Object.keys(STATUS_META) as TaskStatus[]).map((s) => ({
                  value: s,
                  label: STATUS_META[s].label,
                }))}
                selected={statuses}
                onToggle={(v) => toggle(statuses, setStatuses, v)}
              />
            </div>
          </div>
        )}
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Inbox}
            title="No tasks found"
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                New Task
              </Button>
            }
          />
        </Card>
      ) : view === "board" ? (
        <KanbanBoard tasks={filtered} onCardClick={openTask} />
      ) : (
        <DataTable columns={columns} data={filtered} onRowClick={openTask} />
      )}

      <TaskDetailPanel
        task={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
      <CreateTaskDrawer open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { Task, TaskStatus, TASK_COLUMNS, STATUS_META } from "@/lib/types";
import { useApp } from "@/lib/store";
import { TaskCard } from "./task-card";
import { cn } from "@/lib/utils";

function DraggableCard({
  task,
  onClick,
}: {
  task: Task;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
  });
  return (
    <div ref={setNodeRef} className={cn(isDragging && "opacity-40")}>
      <TaskCard
        task={task}
        onClick={onClick}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

function Column({
  status,
  label,
  tasks,
  onCardClick,
}: {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  onCardClick: (t: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div className="flex w-[280px] shrink-0 flex-col lg:w-auto lg:flex-1">
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: STATUS_META[status].accent }}
          />
          <h3 className="text-sm font-semibold">{label}</h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {tasks.length}
          </span>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[200px] flex-1 flex-col gap-2.5 rounded-xl border border-dashed border-transparent p-2 transition-colors",
          isOver ? "border-primary/40 bg-primary/5" : "bg-muted/30"
        )}
      >
        {tasks.map((t) => (
          <DraggableCard key={t.id} task={t} onClick={() => onCardClick(t)} />
        ))}
        {tasks.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-lg text-xs text-muted-foreground">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
}

export function KanbanBoard({
  tasks,
  onCardClick,
}: {
  tasks: Task[];
  onCardClick: (t: Task) => void;
}) {
  const { moveTask } = useApp();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragStart(e: DragStartEvent) {
    setActiveTask(tasks.find((t) => t.id === e.active.id) ?? null);
  }
  function handleDragEnd(e: DragEndEvent) {
    setActiveTask(null);
    if (!e.over) return;
    const newStatus = e.over.id as TaskStatus;
    const task = tasks.find((t) => t.id === e.active.id);
    if (task && task.status !== newStatus) {
      moveTask(task.id, newStatus);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible">
        {TASK_COLUMNS.map((col) => (
          <Column
            key={col.id}
            status={col.id}
            label={col.label}
            tasks={tasks.filter((t) => t.status === col.id)}
            onCardClick={onCardClick}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && (
          <div className="w-[260px]">
            <TaskCard task={activeTask} dragging />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

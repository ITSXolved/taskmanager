import { isWithinInterval } from "date-fns";
import { Project, Task } from "./types";

const NOW = new Date("2026-05-31T09:00:00");

export const isOverdue = (t: Task) =>
  t.status !== "done" && new Date(t.dueDate) < NOW;

export const isDueToday = (t: Task) => {
  const d = new Date(t.dueDate);
  return (
    t.status !== "done" &&
    d.getFullYear() === NOW.getFullYear() &&
    d.getMonth() === NOW.getMonth() &&
    d.getDate() === NOW.getDate()
  );
};

export const completedToday = (t: Task) => {
  if (!t.completedAt) return false;
  const d = new Date(t.completedAt);
  return (
    d.getFullYear() === NOW.getFullYear() &&
    d.getMonth() === NOW.getMonth() &&
    d.getDate() === NOW.getDate()
  );
};

export const daysOverdue = (t: Task) =>
  Math.max(
    0,
    Math.floor((NOW.getTime() - new Date(t.dueDate).getTime()) / 86400000)
  );

export function taskStats(tasks: Task[]) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const inProgress = tasks.filter(
    (t) => t.status === "in_progress" || t.status === "in_review"
  ).length;
  const overdue = tasks.filter(isOverdue).length;
  const completedTodayCount = tasks.filter(completedToday).length;
  const dueTodayCount = tasks.filter(isDueToday).length;
  const completionRate = total ? Math.round((done / total) * 100) : 0;
  return {
    total,
    done,
    inProgress,
    overdue,
    completedTodayCount,
    dueTodayCount,
    completionRate,
  };
}

export function upcomingDeadlines(tasks: Task[], days = 7) {
  const end = new Date(NOW);
  end.setDate(end.getDate() + days);
  return tasks
    .filter(
      (t) =>
        t.status !== "done" &&
        isWithinInterval(new Date(t.dueDate), { start: NOW, end })
    )
    .sort(
      (a, b) =>
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
}

export function projectProgress(project: Project, tasks: Task[]) {
  const projTasks = tasks.filter((t) => t.projectId === project.id);
  if (projTasks.length === 0) {
    // fall back to milestone completion
    const doneMs = project.milestones.filter((m) => m.done).length;
    return project.milestones.length
      ? Math.round((doneMs / project.milestones.length) * 100)
      : 0;
  }
  const done = projTasks.filter((t) => t.status === "done").length;
  return Math.round((done / projTasks.length) * 100);
}

export { NOW };

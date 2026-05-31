"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { CalendarDays, ListChecks, Plus, FolderKanban } from "lucide-react";
import { useApp } from "@/lib/store";
import { projectProgress } from "@/lib/analytics";
import { PageHeader } from "@/components/shared/page-header";
import { ProgressBar } from "@/components/shared/progress-bar";
import { AvatarGroup } from "@/components/shared/avatar-group";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateProjectDrawer } from "@/components/projects/create-project-drawer";
import { PROJECT_STATUS_META } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ProjectsPage() {
  const { projects, tasks, members, isAdmin } = useApp();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Projects"
        actions={
          isAdmin && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Project</span>
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => {
          const progress = projectProgress(project, tasks);
          const projectMembers = members.filter((m) =>
            project.memberIds.includes(m.id)
          );
          const taskCount = tasks.filter(
            (t) => t.projectId === project.id
          ).length;
          const meta = PROJECT_STATUS_META[project.status];

          return (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="group h-full p-5 transition-all hover:-translate-y-0.5 hover:shadow-card-hover">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-chart-5/20 text-primary">
                    <FolderKanban className="h-5 w-5" />
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                      meta.className
                    )}
                  >
                    {meta.label}
                  </span>
                </div>

                <h3 className="font-semibold leading-snug transition-colors group-hover:text-primary">
                  {project.name}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {project.description}
                </p>

                <div className="my-4">
                  <ProgressBar
                    value={progress}
                    label="Progress"
                    indicatorClassName={
                      progress === 100 ? "bg-success" : undefined
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <AvatarGroup members={projectMembers} size="xs" max={4} />
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ListChecks className="h-3.5 w-3.5" />
                      {taskCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {format(new Date(project.deadline), "MMM d")}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <CreateProjectDrawer open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

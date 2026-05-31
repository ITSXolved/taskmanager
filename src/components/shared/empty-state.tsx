import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-14 text-center",
        className
      )}
    >
      <div className="relative">
        <div className="absolute inset-0 animate-pulse rounded-2xl bg-primary/10 blur-xl" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card shadow-card">
          <Icon className="h-7 w-7 text-muted-foreground" />
        </div>
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold">{title}</h3>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

"use client";

import { Avatar } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/misc";
import { Member } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AvatarGroup({
  members,
  max = 4,
  size = "sm",
  className,
}: {
  members: Member[];
  max?: number;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const shown = members.slice(0, max);
  const overflow = members.length - shown.length;
  const offset = size === "xs" ? "-ml-2" : "-ml-2.5";

  return (
    <div className={cn("flex items-center", className)}>
      {shown.map((m, i) => (
        <Tooltip key={m.id}>
          <TooltipTrigger asChild>
            <div className={cn(i > 0 && offset, "transition-transform hover:z-10 hover:-translate-y-0.5")}>
              <Avatar name={m.name} color={m.avatarColor} size={size} />
            </div>
          </TooltipTrigger>
          <TooltipContent>{m.name}</TooltipContent>
        </Tooltip>
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-secondary font-semibold text-secondary-foreground ring-2 ring-card",
            offset,
            size === "xs" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs"
          )}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}

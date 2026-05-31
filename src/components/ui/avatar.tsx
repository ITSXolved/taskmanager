"use client";

import * as React from "react";
import { cn, initials } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  color?: string; // "h s% l%"
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-xl",
};

export function Avatar({
  name,
  color = "244 76% 59%",
  size = "md",
  className,
  ...props
}: AvatarProps) {
  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white ring-2 ring-card",
        sizeMap[size],
        className
      )}
      style={{
        background: `linear-gradient(135deg, hsl(${color}), hsl(${color} / 0.7))`,
      }}
      {...props}
    >
      {initials(name)}
    </div>
  );
}

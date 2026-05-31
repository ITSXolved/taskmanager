"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, Layers, LogOut } from "lucide-react";
import { useApp } from "@/lib/store";
import { NAV_ITEMS, labelForUser } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/misc";

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin, currentUser, signOut } = useApp();
  const items = NAV_ITEMS.filter((i) => i.roles.includes(isAdmin ? "admin" : "user"));

  if (!currentUser) return null;

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-300 lg:flex",
        collapsed ? "w-[76px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-chart-5 shadow-glow">
          <Layers className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <p className="text-base font-bold leading-none tracking-tight">
              TeamFlow
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-sidebar-muted">
              Workspace
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 no-scrollbar">
        {!collapsed && (
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">
            Menu
          </p>
        )}
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const link = (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-sidebar-accent/15 text-white"
                  : "text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground",
                collapsed && "justify-center px-0"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-accent" />
              )}
              <item.icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  active && "text-sidebar-accent"
                )}
              />
              {!collapsed && (
                <span>{labelForUser(item, isAdmin)}</span>
              )}
            </Link>
          );
          return collapsed ? (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right">
                {labelForUser(item, isAdmin)}
              </TooltipContent>
            </Tooltip>
          ) : (
            link
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-sidebar-border p-3">
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg p-2",
            collapsed && "justify-center p-0"
          )}
        >
          <Avatar
            name={currentUser.name}
            color={currentUser.avatarColor}
            size="sm"
          />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {currentUser.name}
              </p>
              <p className="truncate text-xs text-sidebar-muted">
                {currentUser.title}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleSignOut}
              className="rounded-md p-1.5 text-sidebar-muted transition-colors hover:bg-white/5 hover:text-sidebar-foreground"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 hidden h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-muted shadow-md transition-colors hover:text-white lg:flex"
        aria-label="Toggle sidebar"
      >
        <ChevronLeft
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            collapsed && "rotate-180"
          )}
        />
      </button>
    </aside>
  );
}

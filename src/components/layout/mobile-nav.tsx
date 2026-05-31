"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Layers, LogOut, X } from "lucide-react";
import { useApp } from "@/lib/store";
import { NAV_ITEMS, labelForUser } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";

export function BottomNav() {
  const pathname = usePathname();
  const { isAdmin } = useApp();
  const items = NAV_ITEMS.filter(
    (i) => i.primaryMobile && i.roles.includes(isAdmin ? "admin" : "user")
  ).slice(0, 4);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch border-t border-border bg-background/90 backdrop-blur-xl lg:hidden">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            {active && (
              <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />
            )}
            <item.icon className="h-5 w-5" />
            {labelForUser(item, isAdmin)}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin, currentUser, signOut } = useApp();
  const items = NAV_ITEMS.filter((i) =>
    i.roles.includes(isAdmin ? "admin" : "user")
  );

  if (!currentUser) return null;

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 lg:hidden",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
    >
      <div
        className={cn(
          "absolute inset-0 bg-foreground/30 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "absolute inset-y-0 left-0 flex w-72 flex-col bg-sidebar text-sidebar-foreground shadow-glass transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-chart-5">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <p className="text-base font-bold">TeamFlow</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-sidebar-muted hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent/15 text-white"
                    : "text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground"
                )}
              >
                <item.icon
                  className={cn("h-[18px] w-[18px]", active && "text-sidebar-accent")}
                />
                {labelForUser(item, isAdmin)}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3 border-t border-sidebar-border p-4">
          <Avatar
            name={currentUser.name}
            color={currentUser.avatarColor}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{currentUser.name}</p>
            <p className="truncate text-xs text-sidebar-muted">
              {currentUser.title}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-md p-1.5 text-sidebar-muted hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>
    </div>
  );
}

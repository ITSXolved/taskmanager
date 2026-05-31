"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Bell,
  ChevronRight,
  LogOut,
  Menu,
  Moon,
  Repeat,
  Search,
  Settings,
  Sun,
  User as UserIcon,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationDrawer } from "./notification-drawer";

function useCrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((seg, i) => ({
    label: seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    href: "/" + segments.slice(0, i + 1).join("/"),
    last: i === segments.length - 1,
  }));
}

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const {
    currentUser,
    isAdmin,
    actualRole,
    canSwitchRole,
    switchRole,
    unreadCount,
    signOut,
  } = useApp();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const crumbs = useCrumbs();
  const title = crumbs[crumbs.length - 1]?.label ?? "Dashboard";

  if (!currentUser) return null;

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl lg:px-6">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>

        <div className="min-w-0 flex-1">
          <nav className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
            {crumbs.map((c) => (
              <span key={c.href} className="flex items-center gap-1">
                {c.last ? (
                  <span className="font-medium text-foreground">{c.label}</span>
                ) : (
                  <Link href={c.href} className="transition-colors hover:text-foreground">
                    {c.label}
                  </Link>
                )}
                {!c.last && <ChevronRight className="h-3 w-3" />}
              </span>
            ))}
          </nav>
          <h1 className="truncate text-lg font-bold leading-tight tracking-tight sm:hidden">
            {title}
          </h1>
        </div>

        <button className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent md:flex">
          <Search className="h-4 w-4" />
          <span className="pr-8">Search…</span>
          <kbd className="rounded border border-border bg-muted px-1.5 text-[10px] font-medium">
            ⌘K
          </kbd>
        </button>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Search className="h-5 w-5" />
        </Button>

        {canSwitchRole ? (
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex"
            title="Switch between Admin and Member view"
            onClick={() => switchRole(isAdmin ? "user" : actualRole)}
          >
            <Repeat className="h-3.5 w-3.5" />
            Viewing: {isAdmin ? "Admin" : "Member"}
          </Button>
        ) : (
          <Badge variant="secondary" className="hidden sm:flex">
            Member
          </Badge>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          <Sun className="h-5 w-5 dark:hidden" />
          <Moon className="hidden h-5 w-5 dark:block" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => setNotifOpen(true)}
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount}
            </span>
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full focus-ring">
              <Avatar name={currentUser.name} color={currentUser.avatarColor} size="sm" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center gap-3 px-2.5 py-2">
              <Avatar name={currentUser.name} color={currentUser.avatarColor} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{currentUser.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {currentUser.email}
                </p>
              </div>
            </div>
            <div className="px-2.5 pb-2">
              <Badge variant={isAdmin ? "default" : "secondary"}>
                {isAdmin ? "Administrator" : "Member"}
              </Badge>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <UserIcon /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <Settings /> Settings
              </Link>
            </DropdownMenuItem>
            {canSwitchRole && (
              <DropdownMenuItem
                onSelect={() => switchRole(isAdmin ? "user" : actualRole)}
              >
                <Repeat /> View as {isAdmin ? "Member" : "Admin"}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={handleSignOut}>
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <NotificationDrawer open={notifOpen} onOpenChange={setNotifOpen} />
    </>
  );
}

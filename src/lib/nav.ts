import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Users,
  CalendarCheck,
  Bell,
  User,
  LucideIcon,
} from "lucide-react";
import { Role } from "./types";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: Role[];
  primaryMobile?: boolean; // shown in bottom tab bar
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "user"],
    primaryMobile: true,
  },
  {
    label: "Tasks",
    href: "/tasks",
    icon: CheckSquare,
    roles: ["admin", "user"],
    primaryMobile: true,
  },
  {
    label: "Projects",
    href: "/projects",
    icon: FolderKanban,
    roles: ["admin", "user"],
    primaryMobile: true,
  },
  {
    label: "Team",
    href: "/team",
    icon: Users,
    roles: ["admin"],
    primaryMobile: true,
  },
  {
    label: "Scrum",
    href: "/scrum",
    icon: CalendarCheck,
    roles: ["admin", "user"],
  },
  {
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
    roles: ["admin", "user"],
  },
  {
    label: "Profile",
    href: "/profile",
    icon: User,
    roles: ["admin", "user"],
  },
];

export function labelForUser(item: NavItem, isAdmin: boolean) {
  if (item.href === "/tasks" && !isAdmin) return "My Tasks";
  return item.label;
}

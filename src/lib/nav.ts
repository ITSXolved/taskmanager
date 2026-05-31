import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Users,
  Building2,
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

const ALL: Role[] = ["super_admin", "admin", "user"];
const STAFF: Role[] = ["super_admin", "admin"];

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ALL,
    primaryMobile: true,
  },
  {
    label: "Tasks",
    href: "/tasks",
    icon: CheckSquare,
    roles: ALL,
    primaryMobile: true,
  },
  {
    label: "Projects",
    href: "/projects",
    icon: FolderKanban,
    roles: ALL,
    primaryMobile: true,
  },
  {
    label: "Organizations",
    href: "/organizations",
    icon: Building2,
    roles: ["super_admin"],
  },
  {
    label: "Team",
    href: "/team",
    icon: Users,
    roles: STAFF,
    primaryMobile: true,
  },
  {
    label: "Scrum",
    href: "/scrum",
    icon: CalendarCheck,
    roles: ALL,
  },
  {
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
    roles: ALL,
  },
  {
    label: "Profile",
    href: "/profile",
    icon: User,
    roles: ALL,
  },
];

export function labelForUser(item: NavItem, isAdmin: boolean) {
  if (item.href === "/tasks" && !isAdmin) return "My Tasks";
  return item.label;
}

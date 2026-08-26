import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Fingerprint,
  CalendarClock,
  CalendarCheck,
  BarChart3,
  Settings,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Roles that may see this item. Omit for "everyone signed in". */
  roles?: Array<
    "SUPER_ADMIN" | "HR_ADMIN" | "SUPERVISOR" | "TEACHER" | "HOUSE_PARENT" | "SUPPORT_STAFF"
  >;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Staff",
    href: "/staff",
    icon: Users,
    roles: ["SUPER_ADMIN", "HR_ADMIN", "SUPERVISOR"],
  },
  { label: "Attendance", href: "/attendance", icon: Fingerprint },
  {
    label: "Shifts",
    href: "/shifts",
    icon: CalendarClock,
    roles: ["SUPER_ADMIN", "HR_ADMIN", "SUPERVISOR"],
  },
  { label: "Leave", href: "/leave", icon: CalendarCheck },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["SUPER_ADMIN", "HR_ADMIN", "SUPERVISOR"],
  },
  {
    label: "Settings",
    href: "/settings/departments",
    icon: Settings,
    roles: ["SUPER_ADMIN"],
  },
];

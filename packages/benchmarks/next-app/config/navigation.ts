import type { UserRole } from "@/lib/types";

export interface NavigationGroup {
  title: string;
  items: NavigationItem[];
}

export interface NavigationItem {
  label: string;
  href: string;
  icon: string;
  badge?: string | number;
  requiredRole?: UserRole;
  children?: Omit<NavigationItem, "children" | "icon">[];
}

export const navigationGroups: NavigationGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "layout-dashboard" },
      { label: "Analytics", href: "/dashboard/analytics", icon: "bar-chart" },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Bookings", href: "/bookings", icon: "calendar" },
      {
        label: "Integrations",
        href: "/integrations",
        icon: "puzzle",
        requiredRole: "admin",
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        label: "Settings",
        href: "/settings",
        icon: "settings",
        children: [
          { label: "Profile", href: "/settings/profile" },
          { label: "Notifications", href: "/settings/notifications" },
          { label: "Appearance", href: "/settings/appearance" },
        ],
      },
    ],
  },
];

export const breadcrumbLabels: Record<string, string> = {
  dashboard: "Dashboard",
  analytics: "Analytics",
  bookings: "Bookings",
  integrations: "Integrations",
  settings: "Settings",
  profile: "Profile",
  notifications: "Notifications",
  appearance: "Appearance",
};

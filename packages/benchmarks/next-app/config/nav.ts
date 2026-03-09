export interface NavItem {
  title: string;
  href: string;
  icon?: string;
  badge?: string;
  disabled?: boolean;
  external?: boolean;
  children?: NavItem[];
}

export const mainNavItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: "layout-dashboard",
  },
  {
    title: "Analytics",
    href: "/dashboard/analytics",
    icon: "bar-chart-2",
  },
  {
    title: "Users",
    href: "/dashboard/users",
    icon: "users",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: "settings",
  },
];

export const sidebarNavItems: NavItem[] = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: "home",
  },
  {
    title: "Analytics",
    href: "/dashboard/analytics",
    icon: "bar-chart-2",
    children: [
      { title: "Overview", href: "/dashboard/analytics" },
      { title: "Reports", href: "/dashboard/analytics/reports" },
      {
        title: "Real-time",
        href: "/dashboard/analytics/realtime",
        badge: "Live",
      },
    ],
  },
  {
    title: "Notifications",
    href: "/dashboard/notifications",
    icon: "bell",
    badge: "3",
  },
  {
    title: "Users",
    href: "/dashboard/users",
    icon: "users",
    children: [
      { title: "All Users", href: "/dashboard/users" },
      { title: "Teams", href: "/dashboard/users/teams" },
      { title: "Invitations", href: "/dashboard/users/invitations" },
    ],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: "settings",
    children: [
      { title: "General", href: "/settings" },
      { title: "Profile", href: "/settings/profile" },
      { title: "Billing", href: "/settings/billing" },
      { title: "API Keys", href: "/settings/api-keys" },
    ],
  },
];

export const footerNavItems: NavItem[] = [
  { title: "Documentation", href: "https://docs.acme.dev", external: true },
  { title: "Support", href: "https://support.acme.dev", external: true },
  { title: "Privacy", href: "/privacy" },
  { title: "Terms", href: "/terms" },
];

export function findActiveNavItem(
  pathname: string,
  items: NavItem[],
): NavItem | undefined {
  for (const item of items) {
    if (item.href === pathname) return item;
    if (item.children) {
      const child = findActiveNavItem(pathname, item.children);
      if (child) return child;
    }
  }
  return undefined;
}

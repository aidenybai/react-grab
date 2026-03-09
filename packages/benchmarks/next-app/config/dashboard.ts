export interface DashboardWidget {
  id: string;
  type: "stat" | "chart" | "table" | "list" | "custom";
  title: string;
  description?: string;
  span?: 1 | 2 | 3 | 4;
  height?: "sm" | "md" | "lg";
  refreshInterval?: number;
  dataSource?: string;
}

export const defaultDashboardLayout: DashboardWidget[] = [
  {
    id: "total-users",
    type: "stat",
    title: "Total Users",
    span: 1,
    dataSource: "/api/stats/users",
  },
  {
    id: "revenue",
    type: "stat",
    title: "Revenue",
    span: 1,
    dataSource: "/api/stats/revenue",
  },
  {
    id: "active-sessions",
    type: "stat",
    title: "Active Sessions",
    span: 1,
    dataSource: "/api/stats/sessions",
    refreshInterval: 30000,
  },
  {
    id: "conversion-rate",
    type: "stat",
    title: "Conversion Rate",
    span: 1,
    dataSource: "/api/stats/conversion",
  },
  {
    id: "traffic-chart",
    type: "chart",
    title: "Traffic Overview",
    description: "Page views and unique visitors over time",
    span: 3,
    height: "lg",
    dataSource: "/api/analytics/traffic",
  },
  {
    id: "top-pages",
    type: "list",
    title: "Top Pages",
    span: 1,
    height: "lg",
    dataSource: "/api/analytics/top-pages",
  },
  {
    id: "recent-activity",
    type: "table",
    title: "Recent Activity",
    description: "Latest user actions",
    span: 2,
    height: "md",
    dataSource: "/api/activity/recent",
  },
  {
    id: "user-growth",
    type: "chart",
    title: "User Growth",
    span: 2,
    height: "md",
    dataSource: "/api/analytics/user-growth",
  },
];

export const dashboardConfig = {
  gridColumns: 4,
  defaultRefreshInterval: 60000,
  maxWidgets: 12,
  allowCustomWidgets: true,
  themes: ["default", "compact", "spacious"] as const,
  defaultTheme: "default" as const,
};

export type DashboardTheme = (typeof dashboardConfig.themes)[number];

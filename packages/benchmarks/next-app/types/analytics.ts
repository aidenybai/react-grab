export interface AnalyticsOverview {
  totalBookings: number;
  totalUsers: number;
  activeUsers: number;
  revenue: number;
  bookingGrowth: number;
  userGrowth: number;
  averageBookingDuration: number;
  cancellationRate: number;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface AnalyticsChart {
  id: string;
  title: string;
  type: "line" | "bar" | "area" | "pie" | "donut";
  data: TimeSeriesDataPoint[];
  period: AnalyticsPeriod;
}

export type AnalyticsPeriod = "day" | "week" | "month" | "quarter" | "year";

export interface TopPage {
  path: string;
  views: number;
  uniqueVisitors: number;
  avgTimeOnPage: number;
  bounceRate: number;
}

export interface TrafficSource {
  source: string;
  visitors: number;
  percentage: number;
  trend: "up" | "down" | "stable";
}

export interface AnalyticsFilter {
  period: AnalyticsPeriod;
  startDate?: string;
  endDate?: string;
  compareWith?: "previous_period" | "previous_year";
}

export interface AnalyticsExportOptions {
  format: "csv" | "pdf" | "json";
  dateRange: { start: string; end: string };
  metrics: string[];
  includeCharts: boolean;
}

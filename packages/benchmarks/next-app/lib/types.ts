export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export type UserRole = "admin" | "editor" | "viewer" | "member";
export type UserStatus = "active" | "inactive" | "pending" | "suspended";

export interface Team {
  id: string;
  name: string;
  slug: string;
  members: TeamMember[];
  plan: "free" | "pro" | "enterprise";
  createdAt: string;
}

export interface TeamMember {
  userId: string;
  role: "owner" | "admin" | "member";
  joinedAt: string;
}

export interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, string | number | boolean>;
  timestamp?: string;
}

export interface MenuItem {
  label: string;
  href: string;
  icon?: string;
  badge?: string | number;
  children?: MenuItem[];
  requiredRole?: UserRole;
  external?: boolean;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface SelectOption<T = string> {
  label: string;
  value: T;
  description?: string;
  disabled?: boolean;
}

export interface FormFieldError {
  field: string;
  message: string;
}

export type SortDirection = "asc" | "desc";

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface FilterConfig {
  key: string;
  operator: "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "contains" | "in";
  value: string | number | string[];
}

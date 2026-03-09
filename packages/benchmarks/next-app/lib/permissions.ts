import type { UserRole } from "@/lib/types";

export type Permission =
  | "users.read"
  | "users.write"
  | "users.delete"
  | "analytics.read"
  | "analytics.export"
  | "settings.read"
  | "settings.write"
  | "billing.read"
  | "billing.write"
  | "integrations.manage"
  | "api-keys.manage"
  | "bookings.read"
  | "bookings.write"
  | "bookings.delete";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    "users.read",
    "users.write",
    "users.delete",
    "analytics.read",
    "analytics.export",
    "settings.read",
    "settings.write",
    "billing.read",
    "billing.write",
    "integrations.manage",
    "api-keys.manage",
    "bookings.read",
    "bookings.write",
    "bookings.delete",
  ],
  editor: [
    "users.read",
    "analytics.read",
    "analytics.export",
    "settings.read",
    "bookings.read",
    "bookings.write",
  ],
  viewer: ["users.read", "analytics.read", "settings.read", "bookings.read"],
  member: ["analytics.read", "settings.read", "bookings.read"],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(
  role: UserRole,
  permissions: Permission[],
): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(
  role: UserRole,
  permissions: Permission[],
): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function canAccessRoute(role: UserRole, pathname: string): boolean {
  const routePermissions: Record<string, Permission> = {
    "/dashboard/users": "users.read",
    "/dashboard/analytics": "analytics.read",
    "/settings": "settings.read",
    "/settings/billing": "billing.read",
    "/integrations": "integrations.manage",
    "/bookings": "bookings.read",
  };

  const requiredPermission = routePermissions[pathname];
  if (!requiredPermission) return true;
  return hasPermission(role, requiredPermission);
}

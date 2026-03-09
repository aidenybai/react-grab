export type TeamRole = "owner" | "admin" | "member";

export interface TeamPermissions {
  canInvite: boolean;
  canRemoveMembers: boolean;
  canChangeRoles: boolean;
  canEditSettings: boolean;
  canDeleteTeam: boolean;
  canManageBilling: boolean;
}

export function getPermissions(role: TeamRole): TeamPermissions {
  switch (role) {
    case "owner":
      return {
        canInvite: true,
        canRemoveMembers: true,
        canChangeRoles: true,
        canEditSettings: true,
        canDeleteTeam: true,
        canManageBilling: true,
      };
    case "admin":
      return {
        canInvite: true,
        canRemoveMembers: true,
        canChangeRoles: false,
        canEditSettings: true,
        canDeleteTeam: false,
        canManageBilling: false,
      };
    case "member":
      return {
        canInvite: false,
        canRemoveMembers: false,
        canChangeRoles: false,
        canEditSettings: false,
        canDeleteTeam: false,
        canManageBilling: false,
      };
  }
}

export function canPerformAction(
  role: TeamRole,
  action: keyof TeamPermissions,
): boolean {
  return getPermissions(role)[action];
}

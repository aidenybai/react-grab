export interface Team {
  id: string;
  name: string;
  slug: string;
  description?: string;
  avatarUrl?: string;
  memberCount: number;
  plan: TeamPlan;
  createdAt: Date;
  ownerId: string;
}

export interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  name: string;
  email: string;
  role: TeamRole;
  avatarUrl?: string;
  joinedAt: Date;
}

export type TeamRole = "owner" | "admin" | "member";

export type TeamPlan = "free" | "pro" | "enterprise";

export interface TeamInvite {
  id: string;
  teamId: string;
  email: string;
  role: TeamRole;
  status: "pending" | "accepted" | "expired" | "revoked";
  invitedBy: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface TeamActivity {
  id: string;
  teamId: string;
  type:
    | "member_joined"
    | "member_left"
    | "role_changed"
    | "settings_updated"
    | "invite_sent";
  actorId: string;
  actorName: string;
  targetId?: string;
  targetName?: string;
  details?: string;
  timestamp: Date;
}

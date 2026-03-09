export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  memberCount: number;
  teamCount: number;
  plan: OrgPlan;
  domains: OrgDomain[];
  ssoConfig?: SsoConfig;
  createdAt: Date;
  ownerId: string;
}

export type OrgPlan = "free" | "starter" | "pro" | "enterprise";

export interface OrgMember {
  id: string;
  userId: string;
  orgId: string;
  name: string;
  email: string;
  role: OrgRole;
  teams: string[];
  avatarUrl?: string;
  joinedAt: Date;
}

export type OrgRole = "owner" | "admin" | "member";

export interface OrgDomain {
  domain: string;
  verified: boolean;
  verifiedAt?: Date;
  dnsRecords?: DnsRecord[];
}

export interface DnsRecord {
  type: "CNAME" | "TXT" | "A";
  name: string;
  value: string;
}

export interface SsoConfig {
  enabled: boolean;
  provider: string;
  entityId: string;
  ssoUrl: string;
  certificate: string;
}

export interface OrgInvite {
  id: string;
  orgId: string;
  email: string;
  role: OrgRole;
  teamIds: string[];
  status: "pending" | "accepted" | "expired";
  invitedBy: string;
  createdAt: Date;
  expiresAt: Date;
}

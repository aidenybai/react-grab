export interface UserProfile {
  id: string;
  email: string;
  name: string;
  username: string;
  bio?: string;
  avatar?: string;
  timezone: string;
  locale: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  language: string;
  weekStart: 0 | 1;
  timeFormat: "12h" | "24h";
  dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
}

export interface UserSession {
  id: string;
  userId: string;
  device: string;
  browser: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface UserInvitation {
  id: string;
  email: string;
  role: "admin" | "editor" | "viewer" | "member";
  invitedBy: string;
  expiresAt: string;
  status: "pending" | "accepted" | "expired";
}

export type UpdateProfilePayload = Partial<
  Pick<
    UserProfile,
    | "name"
    | "username"
    | "bio"
    | "timezone"
    | "locale"
    | "phone"
    | "company"
    | "jobTitle"
  >
>;

export type UpdatePreferencesPayload = Partial<UserPreferences>;

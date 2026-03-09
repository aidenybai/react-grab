export interface GeneralSettings {
  siteName: string;
  siteUrl: string;
  timezone: string;
  language: string;
  dateFormat: string;
  timeFormat: "12h" | "24h";
}

export interface NotificationSettings {
  emailEnabled: boolean;
  pushEnabled: boolean;
  bookingConfirmation: boolean;
  bookingCancellation: boolean;
  bookingReminder: boolean;
  reminderMinutesBefore: number;
  dailyDigest: boolean;
  weeklyReport: boolean;
  marketingUpdates: boolean;
}

export interface AppearanceSettings {
  theme: "light" | "dark" | "system";
  accentColor: string;
  fontSize: "small" | "medium" | "large";
  compactMode: boolean;
  showAvatars: boolean;
  animationsEnabled: boolean;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  ipWhitelist: string[];
  apiKeyRotationDays: number;
}

export interface SettingsSection {
  id: string;
  label: string;
  description: string;
  icon: string;
  href: string;
}

export const settingsSections: SettingsSection[] = [
  {
    id: "profile",
    label: "Profile",
    description: "Manage your personal information",
    icon: "user",
    href: "/settings/profile",
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Configure notification preferences",
    icon: "bell",
    href: "/settings/notifications",
  },
  {
    id: "appearance",
    label: "Appearance",
    description: "Customize the look and feel",
    icon: "palette",
    href: "/settings/appearance",
  },
  {
    id: "security",
    label: "Security",
    description: "Account security settings",
    icon: "shield",
    href: "/settings/security",
  },
];

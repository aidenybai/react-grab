export type NotificationType =
  | "booking_confirmed"
  | "booking_cancelled"
  | "booking_reminder"
  | "booking_rescheduled"
  | "team_invite"
  | "team_member_joined"
  | "payment_received"
  | "payment_failed"
  | "system_update"
  | "security_alert";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  archived: boolean;
  actionUrl?: string;
  actionLabel?: string;
  sender?: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: string;
}

export interface NotificationGroup {
  date: string;
  notifications: AppNotification[];
}

export interface NotificationPreference {
  type: NotificationType;
  email: boolean;
  push: boolean;
  inApp: boolean;
}

export interface NotificationCounts {
  total: number;
  unread: number;
  byType: Partial<Record<NotificationType, number>>;
}

export interface MarkNotificationPayload {
  notificationIds: string[];
  action: "read" | "unread" | "archive";
}

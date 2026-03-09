"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";

interface Notification {
  id: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  timestamp?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (msg: string, type?: Notification["type"]) => void;
  clearNotifications: () => void;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  addNotification: () => {},
  clearNotifications: () => {},
  unreadCount: 0,
});

export const useNotifications = () => useContext(NotificationContext);

const badgeColors: Record<string, { bg: string; text: string }> = {
  idle: { bg: "#e5e7eb", text: "#6b7280" },
  active: { bg: "#dcfce7", text: "#166534" },
  error: { bg: "#fef2f2", text: "#991b1b" },
};

type BadgeStatus = keyof typeof badgeColors;

export const NotificationStatusBadge = ({
  status = "idle",
  count,
}: {
  status?: BadgeStatus;
  count?: number;
}) => {
  const colors = badgeColors[status] ?? badgeColors.idle;
  return (
    <span
      data-testid="provider-status-badge"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 8px",
        borderRadius: "9999px",
        fontSize: "12px",
        fontWeight: 500,
        background: colors.bg,
        color: colors.text,
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background:
            status === "active"
              ? "#22c55e"
              : status === "error"
                ? "#ef4444"
                : "#9ca3af",
        }}
      />
      {count !== undefined ? `${count} pending` : status}
    </span>
  );
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification: (msg, type = "info") =>
          setNotifications((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              message: msg,
              type,
              timestamp: Date.now(),
            },
          ]),
        clearNotifications: () => setNotifications([]),
        unreadCount: notifications.length,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

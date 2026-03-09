"use client";

import React, { useState, useMemo } from "react";

interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface NotificationListProps {
  notifications: Notification[];
  onMarkRead?: (id: string) => void;
  onMarkAllRead?: () => void;
  onDismiss?: (id: string) => void;
  onClearAll?: () => void;
  filter?: "all" | "unread" | "read";
  emptyMessage?: string;
  className?: string;
}

export function NotificationList({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onDismiss,
  onClearAll,
  filter = "all",
  emptyMessage = "No notifications",
  className,
}: NotificationListProps) {
  const [activeFilter, setActiveFilter] = useState(filter);

  const filteredNotifications = useMemo(() => {
    switch (activeFilter) {
      case "unread":
        return notifications.filter((n) => !n.read);
      case "read":
        return notifications.filter((n) => n.read);
      default:
        return notifications;
    }
  }, [notifications, activeFilter]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const typeIcons: Record<string, string> = {
    info: "\u2139\uFE0F",
    success: "\u2705",
    warning: "\u26A0\uFE0F",
    error: "\u274C",
  };

  return (
    <div className={`rounded-lg border bg-white ${className ?? ""}`}>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
          {unreadCount > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onMarkAllRead && unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-xs text-indigo-600 hover:underline"
            >
              Mark all read
            </button>
          )}
          {onClearAll && (
            <button
              onClick={onClearAll}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 border-b px-4 py-2">
        {(["all", "unread", "read"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize ${
              activeFilter === f
                ? "bg-gray-100 text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="max-h-96 divide-y overflow-y-auto">
        {filteredNotifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            {emptyMessage}
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex items-start gap-3 px-4 py-3 ${notification.read ? "" : "bg-blue-50/50"}`}
            >
              <span className="mt-0.5 text-sm">
                {typeIcons[notification.type]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {notification.title}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {notification.message}
                </p>
                <p className="mt-1 text-[10px] text-gray-400">
                  {new Date(notification.timestamp).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {!notification.read && onMarkRead && (
                  <button
                    onClick={() => onMarkRead(notification.id)}
                    className="rounded p-1 text-gray-300 hover:bg-gray-100 hover:text-gray-500"
                    title="Mark read"
                  >
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                  </button>
                )}
                {onDismiss && (
                  <button
                    onClick={() => onDismiss(notification.id)}
                    className="rounded p-1 text-gray-300 hover:bg-gray-100 hover:text-gray-500"
                    title="Dismiss"
                  >
                    <svg
                      className="h-3 w-3"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default NotificationList;

"use client";

import React from "react";

interface NotificationCardProps {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  timestamp: string;
  read?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  onMarkRead?: () => void;
  className?: string;
}

const typeStyles = {
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: "text-blue-500",
    dot: "bg-blue-500",
  },
  success: {
    bg: "bg-green-50",
    border: "border-green-200",
    icon: "text-green-500",
    dot: "bg-green-500",
  },
  warning: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    icon: "text-yellow-500",
    dot: "bg-yellow-500",
  },
  error: {
    bg: "bg-red-50",
    border: "border-red-200",
    icon: "text-red-500",
    dot: "bg-red-500",
  },
};

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

export function NotificationCard({
  type,
  title,
  message,
  timestamp,
  read = false,
  actionLabel,
  onAction,
  onDismiss,
  onMarkRead,
  className,
}: NotificationCardProps) {
  const styles = typeStyles[type];

  return (
    <div
      className={`relative rounded-lg border p-4 transition-all ${styles.border} ${
        read ? "bg-white" : styles.bg
      } ${className ?? ""}`}
    >
      <div className="flex items-start gap-3">
        {!read && (
          <span
            className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${styles.dot}`}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
            <span className="flex-shrink-0 text-xs text-gray-400">
              {formatTimestamp(timestamp)}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600">{message}</p>
          <div className="mt-2 flex items-center gap-2">
            {actionLabel && onAction && (
              <button
                onClick={onAction}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
              >
                {actionLabel}
              </button>
            )}
            {!read && onMarkRead && (
              <button
                onClick={onMarkRead}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Mark as read
              </button>
            )}
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 rounded p-1 text-gray-300 hover:bg-gray-100 hover:text-gray-500"
            aria-label="Dismiss"
          >
            <svg
              className="h-4 w-4"
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
  );
}

export default NotificationCard;

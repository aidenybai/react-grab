"use client";
import React from "react";

interface NotificationCardProps {
  title: string;
  message: string;
  timestamp: string;
  read?: boolean;
  type?: "info" | "success" | "warning" | "error";
  onMarkRead?: () => void;
}

export const NotificationCard = ({
  title,
  message,
  timestamp,
  read = false,
  type = "info",
  onMarkRead,
}: NotificationCardProps) => (
  <div
    style={{
      padding: "12px 16px",
      borderBottom: "1px solid #f3f4f6",
      background: read ? "#fff" : "#f8fafc",
      display: "flex",
      gap: "12px",
      alignItems: "flex-start",
      cursor: "pointer",
    }}
    onClick={onMarkRead}
  >
    {!read && (
      <span
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: "#2563eb",
          flexShrink: 0,
          marginTop: "6px",
        }}
      />
    )}
    <div style={{ flex: 1, minWidth: 0 }}>
      <p
        style={{
          fontSize: "14px",
          fontWeight: read ? 400 : 600,
          margin: "0 0 2px 0",
        }}
      >
        {title}
      </p>
      <p
        style={{
          fontSize: "13px",
          color: "#6b7280",
          margin: "0 0 4px 0",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {message}
      </p>
      <span style={{ fontSize: "11px", color: "#9ca3af" }}>{timestamp}</span>
    </div>
  </div>
);

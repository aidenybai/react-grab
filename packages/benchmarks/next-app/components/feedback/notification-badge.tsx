"use client";

import React from "react";

interface NotificationBadgeProps {
  count: number;
  max?: number;
  showZero?: boolean;
  pulse?: boolean;
  offset?: { x?: number; y?: number };
  children: React.ReactNode;
}

export function NotificationBadge({
  count,
  max = 99,
  showZero = false,
  pulse = false,
  offset = {},
  children,
}: NotificationBadgeProps) {
  const shouldShow = count > 0 || showZero;
  const display = count > max ? `${max}+` : String(count);

  if (!shouldShow) return <>{children}</>;

  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      {children}
      <span
        style={{
          position: "absolute",
          top: offset.y ?? -6,
          right: offset.x ?? -6,
          minWidth: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: "#EF4444",
          color: "#FFFFFF",
          fontSize: 11,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 4px",
          border: "2px solid #FFFFFF",
          lineHeight: 1,
          animation: pulse ? "pulse 2s infinite" : undefined,
        }}
      >
        {display}
      </span>
    </div>
  );
}

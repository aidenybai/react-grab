"use client";

import React from "react";

interface MenuItemProps {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  shortcut?: string;
  destructive?: boolean;
}

export function MenuItem({
  label,
  href,
  icon,
  active = false,
  disabled = false,
  onClick,
  shortcut,
  destructive = false,
}: MenuItemProps) {
  const Component = href ? "a" : "button";

  return (
    <Component
      href={href}
      onClick={disabled ? undefined : onClick}
      disabled={Component === "button" ? disabled : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "8px 12px",
        border: "none",
        background: active ? "#F3F4F6" : "transparent",
        color: disabled ? "#D1D5DB" : destructive ? "#DC2626" : "#374151",
        fontSize: 14,
        textDecoration: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        borderRadius: 4,
        textAlign: "left",
      }}
    >
      {icon && (
        <span
          style={{
            width: 16,
            height: 16,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
          }}
        >
          {icon}
        </span>
      )}
      <span style={{ flex: 1 }}>{label}</span>
      {shortcut && (
        <kbd
          style={{
            fontSize: 11,
            color: "#9CA3AF",
            fontFamily: "monospace",
            backgroundColor: "#F3F4F6",
            padding: "1px 4px",
            borderRadius: 3,
            border: "1px solid #E5E7EB",
          }}
        >
          {shortcut}
        </kbd>
      )}
    </Component>
  );
}

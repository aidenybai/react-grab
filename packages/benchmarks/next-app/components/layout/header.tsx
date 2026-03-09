"use client";

import React from "react";

interface HeaderProps {
  logo?: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  navigation?: React.ReactNode;
  sticky?: boolean;
  bordered?: boolean;
  className?: string;
}

export function Header({
  logo,
  title,
  actions,
  navigation,
  sticky = true,
  bordered = true,
  className,
}: HeaderProps) {
  return (
    <header
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        height: 56,
        padding: "0 16px",
        backgroundColor: "#FFFFFF",
        borderBottom: bordered ? "1px solid #E5E7EB" : "none",
        position: sticky ? "sticky" : "relative",
        top: 0,
        zIndex: 40,
        gap: 16,
      }}
    >
      {logo && <div style={{ flexShrink: 0 }}>{logo}</div>}
      {title && (
        <h1
          style={{ fontSize: 16, fontWeight: 600, color: "#111827", margin: 0 }}
        >
          {title}
        </h1>
      )}
      {navigation && (
        <nav style={{ flex: 1, display: "flex", alignItems: "center", gap: 4 }}>
          {navigation}
        </nav>
      )}
      {!navigation && <div style={{ flex: 1 }} />}
      {actions && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          {actions}
        </div>
      )}
    </header>
  );
}

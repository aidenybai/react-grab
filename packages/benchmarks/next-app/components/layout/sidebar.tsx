"use client";

import React, { useState } from "react";

interface SidebarItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  active?: boolean;
  children?: SidebarItem[];
}

interface SidebarProps {
  items: SidebarItem[];
  collapsed?: boolean;
  onToggle?: () => void;
  width?: number;
  collapsedWidth?: number;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export function Sidebar({
  items,
  collapsed = false,
  onToggle,
  width = 260,
  collapsedWidth = 64,
  header,
  footer,
}: SidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (label: string) => {
    const next = new Set(expandedGroups);
    next.has(label) ? next.delete(label) : next.add(label);
    setExpandedGroups(next);
  };

  return (
    <aside
      style={{
        width: collapsed ? collapsedWidth : width,
        height: "100vh",
        borderRight: "1px solid #E5E7EB",
        backgroundColor: "#FAFAFA",
        display: "flex",
        flexDirection: "column",
        transition: "width 200ms ease",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {header && (
        <div style={{ padding: 16, borderBottom: "1px solid #E5E7EB" }}>
          {header}
        </div>
      )}
      <nav style={{ flex: 1, overflowY: "auto", padding: 8 }}>
        {items.map((item) => (
          <div key={item.label}>
            <a
              href={item.href || "#"}
              onClick={
                item.children
                  ? (e) => {
                      e.preventDefault();
                      toggleGroup(item.label);
                    }
                  : undefined
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 12px",
                borderRadius: 6,
                fontSize: 14,
                color: item.active ? "#1D4ED8" : "#374151",
                backgroundColor: item.active ? "#EFF6FF" : "transparent",
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </a>
            {item.children && expandedGroups.has(item.label) && !collapsed && (
              <div style={{ paddingLeft: 28 }}>
                {item.children.map((child) => (
                  <a
                    key={child.label}
                    href={child.href || "#"}
                    style={{
                      display: "block",
                      padding: "6px 12px",
                      fontSize: 13,
                      color: "#6B7280",
                      textDecoration: "none",
                      borderRadius: 4,
                    }}
                  >
                    {child.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      {footer && (
        <div style={{ padding: 16, borderTop: "1px solid #E5E7EB" }}>
          {footer}
        </div>
      )}
      {onToggle && (
        <button
          onClick={onToggle}
          style={{
            padding: 12,
            border: "none",
            background: "none",
            cursor: "pointer",
            borderTop: "1px solid #E5E7EB",
            color: "#9CA3AF",
            fontSize: 12,
          }}
        >
          {collapsed ? "\u00BB" : "\u00AB"} {!collapsed && "Collapse"}
        </button>
      )}
    </aside>
  );
}

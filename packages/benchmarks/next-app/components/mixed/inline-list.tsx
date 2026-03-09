"use client";
import React from "react";

interface ListItem {
  id: string;
  label: string;
  description?: string;
  tag?: string;
}

export function InlineList({
  items,
  "data-testid": testId,
}: {
  items: ListItem[];
  "data-testid"?: string;
}) {
  return (
    <div
      data-testid={testId}
      style={{
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {items.map((item, i) => (
        <div
          key={item.id}
          data-testid={i === 0 ? "inline-list-first-item" : undefined}
          style={{
            padding: "12px 16px",
            borderBottom:
              i < items.length - 1 ? "1px solid var(--border)" : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "var(--foreground)",
              }}
            >
              {item.label}
            </div>
            {item.description && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--muted-foreground)",
                  marginTop: 2,
                }}
              >
                {item.description}
              </div>
            )}
          </div>
          {item.tag && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                padding: "2px 8px",
                borderRadius: 9999,
                background: "var(--accent)",
                color: "var(--accent-foreground)",
              }}
            >
              {item.tag}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

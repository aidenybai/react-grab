"use client";
import React, { useState } from "react";

interface MenuItem {
  label: string;
  children?: MenuItem[];
}

function MenuNode({
  item,
  level,
  "data-testid": testId,
}: {
  item: MenuItem;
  level: number;
  "data-testid"?: string;
}) {
  const [expanded, setExpanded] = useState(level < 3);
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div style={{ paddingLeft: level * 16 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        data-testid={!hasChildren ? testId : undefined}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 8px",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 13,
          color: "var(--foreground)",
          width: "100%",
          textAlign: "left",
        }}
      >
        {hasChildren && <span>{expanded ? "▼" : "▶"}</span>}
        {item.label}
      </button>
      {expanded &&
        hasChildren &&
        item.children!.map((child, i) => (
          <MenuNode
            key={i}
            item={child}
            level={level + 1}
            data-testid={testId}
          />
        ))}
    </div>
  );
}

function generateMenu(
  depth: number,
  breadth: number = 2,
  prefix: string = "Item",
): MenuItem[] {
  if (depth <= 0) return [];
  return Array.from({ length: breadth }, (_, i) => ({
    label: `${prefix} ${i + 1}`,
    children: generateMenu(depth - 1, breadth, `${prefix} ${i + 1}`),
  }));
}

export function RecursiveMenu({
  depth = 10,
  "data-testid": testId,
}: {
  depth?: number;
  "data-testid"?: string;
}) {
  const menu = generateMenu(depth);
  return (
    <div
      data-testid={testId}
      style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 8 }}
    >
      {menu.map((item, i) => (
        <MenuNode
          key={i}
          item={item}
          level={0}
          data-testid="recursive-menu-deepest"
        />
      ))}
    </div>
  );
}

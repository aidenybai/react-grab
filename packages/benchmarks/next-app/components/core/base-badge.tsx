"use client";

import React from "react";

type BadgeSize = "small" | "large";

interface BaseBadgeProps {
  count?: number;
  maxCount?: number;
  size?: BadgeSize;
  visible?: boolean;
  children?: React.ReactNode;
}

export function BaseBadge({
  count,
  maxCount = 999,
  size = "large",
  visible = true,
  children,
}: BaseBadgeProps) {
  if (!visible) return <>{children}</>;

  const displayCount =
    count !== undefined && count > maxCount ? `${maxCount}+` : count;
  const isSmall = size === "small" || count === undefined;

  const badge = (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: isSmall ? 6 : 16,
        height: isSmall ? 6 : 16,
        borderRadius: isSmall ? 3 : 8,
        backgroundColor: "#B3261E",
        color: "#FFFFFF",
        fontSize: 11,
        fontWeight: 500,
        padding: isSmall ? 0 : "0 4px",
        position: children ? "absolute" : "relative",
        top: children ? -4 : undefined,
        right: children ? -4 : undefined,
      }}
    >
      {!isSmall && displayCount}
    </span>
  );

  if (!children) return badge;

  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      {children}
      {badge}
    </span>
  );
}

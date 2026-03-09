"use client";

import React from "react";

interface GridProps {
  children: React.ReactNode;
  columns?: number | { sm?: number; md?: number; lg?: number; xl?: number };
  gap?: number;
  rowGap?: number;
  colGap?: number;
  className?: string;
}

export function Grid({
  children,
  columns = 3,
  gap = 16,
  rowGap,
  colGap,
  className,
}: GridProps) {
  const cols = typeof columns === "number" ? columns : columns.md || 3;

  return (
    <div
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: rowGap || colGap ? undefined : gap,
        rowGap: rowGap ?? gap,
        columnGap: colGap ?? gap,
      }}
    >
      {children}
    </div>
  );
}

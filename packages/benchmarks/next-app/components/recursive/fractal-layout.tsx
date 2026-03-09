"use client";
import React from "react";

function FractalCell({
  depth,
  maxDepth,
  index,
  leafTestId,
}: {
  depth: number;
  maxDepth: number;
  index: number;
  leafTestId?: string;
}) {
  if (depth >= maxDepth) {
    return (
      <div
        data-testid={depth === maxDepth && index === 0 ? leafTestId : undefined}
        style={{
          background: `hsl(${(depth * 40 + index * 20) % 360}, 60%, 80%)`,
          borderRadius: 4,
          padding: 4,
          fontSize: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 24,
        }}
      >
        {depth},{index}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 2,
        padding: 2,
        border: "1px solid var(--border)",
        borderRadius: 4,
      }}
    >
      {Array.from({ length: 4 }, (_, i) => (
        <FractalCell
          key={i}
          depth={depth + 1}
          maxDepth={maxDepth}
          index={i}
          leafTestId={leafTestId}
        />
      ))}
    </div>
  );
}

export function FractalLayout({
  depth = 4,
  "data-testid": testId,
}: {
  depth?: number;
  "data-testid"?: string;
}) {
  return (
    <div data-testid={testId} style={{ maxWidth: 400 }}>
      <FractalCell
        depth={0}
        maxDepth={depth}
        index={0}
        leafTestId="fractal-innermost"
      />
    </div>
  );
}

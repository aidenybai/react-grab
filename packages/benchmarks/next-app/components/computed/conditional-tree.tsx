"use client";
import React from "react";

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function Branch({
  value,
  depth,
  maxDepth,
  leafTestId,
}: {
  value: number;
  depth: number;
  maxDepth: number;
  leafTestId?: string;
}) {
  if (depth >= maxDepth) {
    return (
      <div
        data-testid={leafTestId}
        style={{
          padding: 8,
          margin: 2,
          borderRadius: 4,
          background: `hsl(${value % 360}, 50%, 85%)`,
          fontSize: 11,
        }}
      >
        Leaf:{value}
      </div>
    );
  }

  const left = (value * 31 + 7) % 1000;
  const right = (value * 37 + 13) % 1000;

  return (
    <div style={{ display: "flex", gap: 4, paddingLeft: 8 }}>
      {value % 3 === 0 ? (
        <Branch
          value={left}
          depth={depth + 1}
          maxDepth={maxDepth}
          leafTestId={leafTestId}
        />
      ) : (
        <>
          <Branch
            value={left}
            depth={depth + 1}
            maxDepth={maxDepth}
            leafTestId={leafTestId}
          />
          <Branch
            value={right}
            depth={depth + 1}
            maxDepth={maxDepth}
            leafTestId={leafTestId}
          />
        </>
      )}
    </div>
  );
}

export function ConditionalTree({
  seed = "benchmark",
  depth = 6,
  "data-testid": testId,
}: {
  seed?: string;
  depth?: number;
  "data-testid"?: string;
}) {
  const rootValue = hashCode(seed);
  return (
    <div data-testid={testId} style={{ overflow: "auto" }}>
      <Branch
        value={rootValue}
        depth={0}
        maxDepth={depth}
        leafTestId="conditional-tree-leaf"
      />
    </div>
  );
}

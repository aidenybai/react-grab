"use client";
import React, { Suspense, lazy, useState, useEffect } from "react";

const LazyContent = lazy(
  () =>
    new Promise<{ default: React.ComponentType<{ "data-testid"?: string }> }>(
      (resolve) => {
        setTimeout(() => {
          resolve({
            default: function LazyLoadedContent({
              "data-testid": testId,
            }: {
              "data-testid"?: string;
            }) {
              return (
                <div
                  data-testid={testId}
                  style={{
                    padding: 16,
                    border: "1px dashed var(--border)",
                    borderRadius: 8,
                  }}
                >
                  Lazy-loaded content
                </div>
              );
            },
          });
        }, 100);
      },
    ),
);

export function SuspenseLazyLoader({
  "data-testid": testId,
}: {
  "data-testid"?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div>Loading...</div>;

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyContent data-testid={testId} />
    </Suspense>
  );
}

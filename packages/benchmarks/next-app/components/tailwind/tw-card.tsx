"use client";
import React from "react";

export function TwCard({
  title,
  children,
  "data-testid": testId,
}: {
  title: string;
  children: React.ReactNode;
  "data-testid"?: string;
}) {
  return (
    <div
      data-testid={testId}
      className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-sm hover:shadow-md transition-shadow"
    >
      <h3 className="text-lg font-semibold mb-2 text-[var(--foreground)]">
        {title}
      </h3>
      <div className="text-sm text-[var(--muted-foreground)] leading-relaxed">
        {children}
      </div>
    </div>
  );
}

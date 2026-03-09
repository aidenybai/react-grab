"use client";
import React from "react";
import * as Popover from "@radix-ui/react-popover";

export function RadixPopover({
  triggerLabel,
  children,
  "data-testid": testId,
}: {
  triggerLabel: string;
  children: React.ReactNode;
  "data-testid"?: string;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          data-testid={testId}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--background)",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          {triggerLabel}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={5}
          style={{
            background: "var(--background)",
            borderRadius: 8,
            border: "1px solid var(--border)",
            padding: 16,
            minWidth: 200,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          {children}
          <Popover.Arrow style={{ fill: "var(--background)" }} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

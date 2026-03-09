"use client";
import React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

export function RadixDropdown({
  triggerLabel,
  items,
  "data-testid": testId,
}: {
  triggerLabel: string;
  items: { label: string; onClick?: () => void; testId?: string }[];
  "data-testid"?: string;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
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
          {triggerLabel} ▾
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={5}
          style={{
            background: "var(--background)",
            borderRadius: 8,
            border: "1px solid var(--border)",
            padding: 4,
            minWidth: 160,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          {items.map((item) => (
            <DropdownMenu.Item
              key={item.label}
              data-testid={item.testId}
              onSelect={item.onClick}
              style={{
                padding: "8px 12px",
                borderRadius: 4,
                fontSize: 14,
                cursor: "pointer",
                outline: "none",
              }}
            >
              {item.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

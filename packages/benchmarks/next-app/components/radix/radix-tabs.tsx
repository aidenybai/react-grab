"use client";
import React from "react";
import * as Tabs from "@radix-ui/react-tabs";

export function RadixTabs({
  tabs,
  defaultValue,
  "data-testid": testId,
}: {
  tabs: {
    value: string;
    label: string;
    content: React.ReactNode;
    testId?: string;
  }[];
  defaultValue?: string;
  "data-testid"?: string;
}) {
  return (
    <Tabs.Root
      defaultValue={defaultValue || tabs[0]?.value}
      data-testid={testId}
    >
      <Tabs.List
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "1px solid var(--border)",
          marginBottom: 16,
        }}
      >
        {tabs.map((tab) => (
          <Tabs.Trigger
            key={tab.value}
            value={tab.value}
            data-testid={tab.testId}
            style={{
              padding: "8px 16px",
              background: "none",
              border: "none",
              borderBottom: "2px solid transparent",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              color: "var(--muted-foreground)",
            }}
          >
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {tabs.map((tab) => (
        <Tabs.Content key={tab.value} value={tab.value}>
          {tab.content}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}

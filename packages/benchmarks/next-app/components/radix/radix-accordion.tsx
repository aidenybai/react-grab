"use client";
import React from "react";
import * as Accordion from "@radix-ui/react-accordion";

export function RadixAccordion({
  items,
  "data-testid": testId,
}: {
  items: {
    value: string;
    title: string;
    content: React.ReactNode;
    testId?: string;
  }[];
  "data-testid"?: string;
}) {
  return (
    <Accordion.Root type="single" collapsible data-testid={testId}>
      {items.map((item) => (
        <Accordion.Item
          key={item.value}
          value={item.value}
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <Accordion.Header>
            <Accordion.Trigger
              data-testid={item.testId}
              style={{
                display: "flex",
                width: "100%",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 0",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {item.title}
              <span>▼</span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content
            style={{
              overflow: "hidden",
              fontSize: 14,
              color: "var(--muted-foreground)",
              paddingBottom: 12,
            }}
          >
            {item.content}
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}

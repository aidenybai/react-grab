"use client";
import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";

export function RadixDialog({
  triggerLabel,
  title,
  description,
  children,
  "data-testid": testId,
}: {
  triggerLabel: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
  "data-testid"?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
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
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 50,
          }}
        />
        <Dialog.Content
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "var(--background)",
            borderRadius: 12,
            padding: 24,
            minWidth: 400,
            zIndex: 51,
            border: "1px solid var(--border)",
          }}
        >
          <Dialog.Title style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
            {title}
          </Dialog.Title>
          {description && (
            <Dialog.Description
              style={{
                fontSize: 14,
                color: "var(--muted-foreground)",
                marginTop: 8,
              }}
            >
              {description}
            </Dialog.Description>
          )}
          <div style={{ marginTop: 16 }}>{children}</div>
          <Dialog.Close asChild>
            <button
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: "none",
                border: "none",
                fontSize: 18,
                cursor: "pointer",
                color: "var(--muted-foreground)",
              }}
            >
              ✕
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

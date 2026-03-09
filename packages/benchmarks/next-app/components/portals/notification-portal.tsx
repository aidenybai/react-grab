"use client";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function NotificationPortal({
  message,
  visible,
  "data-testid": testId,
}: {
  message: string;
  visible: boolean;
  "data-testid"?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !visible) return null;

  return createPortal(
    <div
      data-testid={testId}
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        background: "var(--primary)",
        color: "var(--primary-foreground)",
        padding: "12px 20px",
        borderRadius: 8,
        fontSize: 14,
        zIndex: 400,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      }}
    >
      {message}
    </div>,
    document.body,
  );
}

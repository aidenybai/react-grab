"use client";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

export function ModalPortal({
  triggerLabel,
  children,
  "data-testid": testId,
}: {
  triggerLabel: string;
  children: React.ReactNode;
  "data-testid"?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: "8px 16px",
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "var(--background)",
          cursor: "pointer",
        }}
      >
        {triggerLabel}
      </button>
      {mounted &&
        open &&
        createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 200,
            }}
          >
            <div
              onClick={() => setOpen(false)}
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.4)",
              }}
            />
            <div
              data-testid={testId}
              style={{
                position: "relative",
                background: "var(--background)",
                borderRadius: 12,
                padding: 24,
                minWidth: 400,
                border: "1px solid var(--border)",
              }}
            >
              <button
                onClick={() => setOpen(false)}
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  background: "none",
                  border: "none",
                  fontSize: 18,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
              {children}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

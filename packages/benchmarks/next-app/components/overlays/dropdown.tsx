"use client";

import React, { useState, useRef, useEffect } from "react";

interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  onSelect: (id: string) => void;
  placement?: "bottom-start" | "bottom-end" | "top-start" | "top-end";
  width?: number;
}

export function Dropdown({
  trigger,
  items,
  onSelect,
  placement = "bottom-start",
  width = 180,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const positionStyle: React.CSSProperties = {
    position: "absolute",
    zIndex: 50,
    ...(placement.startsWith("bottom")
      ? { top: "100%", marginTop: 4 }
      : { bottom: "100%", marginBottom: 4 }),
    ...(placement.endsWith("start") ? { left: 0 } : { right: 0 }),
  };

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <div onClick={() => setOpen(!open)} style={{ cursor: "pointer" }}>
        {trigger}
      </div>
      {open && (
        <div
          style={{
            ...positionStyle,
            width,
            backgroundColor: "#FFFFFF",
            borderRadius: 8,
            border: "1px solid #E5E7EB",
            boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
            padding: 4,
            overflow: "hidden",
          }}
        >
          {items.map((item) =>
            item.separator ? (
              <div
                key={item.id}
                style={{
                  height: 1,
                  backgroundColor: "#F3F4F6",
                  margin: "4px 0",
                }}
              />
            ) : (
              <button
                key={item.id}
                onClick={() => {
                  onSelect(item.id);
                  setOpen(false);
                }}
                disabled={item.disabled}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "8px 10px",
                  border: "none",
                  background: "none",
                  fontSize: 13,
                  color: item.danger
                    ? "#DC2626"
                    : item.disabled
                      ? "#D1D5DB"
                      : "#374151",
                  cursor: item.disabled ? "not-allowed" : "pointer",
                  borderRadius: 4,
                  textAlign: "left",
                }}
              >
                {item.icon}
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

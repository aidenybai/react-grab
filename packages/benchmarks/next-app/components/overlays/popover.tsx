"use client";

import React, { useState, useRef, useEffect } from "react";

interface PopoverProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  offset?: number;
  closeOnClickOutside?: boolean;
}

export function Popover({
  trigger,
  children,
  side = "bottom",
  align = "center",
  offset = 8,
  closeOnClickOutside = true,
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !closeOnClickOutside) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, closeOnClickOutside]);

  const positionStyle: React.CSSProperties = {
    position: "absolute",
    zIndex: 50,
    ...(side === "bottom" ? { top: `calc(100% + ${offset}px)` } : {}),
    ...(side === "top" ? { bottom: `calc(100% + ${offset}px)` } : {}),
    ...(side === "left" ? { right: `calc(100% + ${offset}px)`, top: 0 } : {}),
    ...(side === "right" ? { left: `calc(100% + ${offset}px)`, top: 0 } : {}),
    ...(align === "start" ? { left: 0 } : {}),
    ...(align === "end" ? { right: 0 } : {}),
    ...(align === "center" && (side === "top" || side === "bottom")
      ? { left: "50%", transform: "translateX(-50%)" }
      : {}),
  };

  return (
    <div
      ref={popoverRef}
      style={{ position: "relative", display: "inline-block" }}
    >
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div
          style={{
            ...positionStyle,
            minWidth: 200,
            backgroundColor: "#FFFFFF",
            borderRadius: 8,
            border: "1px solid #E5E7EB",
            boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
            padding: 12,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

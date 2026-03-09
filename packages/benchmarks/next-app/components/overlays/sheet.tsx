"use client";

import React, { useEffect } from "react";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: "top" | "right" | "bottom" | "left";
  children: React.ReactNode;
  className?: string;
}

export function Sheet({
  open,
  onOpenChange,
  side = "right",
  children,
  className,
}: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  const sideClasses: Record<string, string> = {
    top: "inset-x-0 top-0 border-b",
    right: "inset-y-0 right-0 w-3/4 max-w-sm border-l",
    bottom: "inset-x-0 bottom-0 border-t",
    left: "inset-y-0 left-0 w-3/4 max-w-sm border-r",
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={`fixed z-50 bg-white shadow-xl ${sideClasses[side]} ${className || ""}`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-end p-4">
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-sm opacity-70 hover:opacity-100 transition-opacity"
            >
              <span className="text-xl">&times;</span>
            </button>
          </div>
          <div className="flex-1 overflow-auto px-6 pb-6">{children}</div>
        </div>
      </div>
    </>
  );
}

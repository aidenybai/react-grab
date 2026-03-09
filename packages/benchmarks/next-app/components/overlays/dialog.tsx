"use client";

import React, { useEffect, useRef, useCallback } from "react";

interface OverlayDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl" | "fullscreen";
  closable?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const sizeWidths = { sm: 400, md: 520, lg: 680, xl: 860, fullscreen: "100vw" };

export function Dialog({
  open,
  onClose,
  title,
  description,
  size = "md",
  closable = true,
  children,
  footer,
}: OverlayDialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && closable) onClose();
    },
    [onClose, closable],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closable ? onClose : undefined}
      />
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        className="relative flex max-h-[85vh] flex-col rounded-xl bg-white shadow-2xl"
        style={{
          width: sizeWidths[size],
          maxWidth: size === "fullscreen" ? undefined : "90vw",
        }}
      >
        {(title || closable) && (
          <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
            <div>
              {title && (
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-gray-500">{description}</p>
              )}
            </div>
            {closable && (
              <button
                onClick={onClose}
                className="ml-4 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <span className="text-xl leading-none">&times;</span>
              </button>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

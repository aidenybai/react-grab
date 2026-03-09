"use client";

import React, { useState, useRef, useEffect } from "react";

interface ActionMenuItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  divider?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  trigger?: React.ReactNode;
  align?: "left" | "right";
}

export function ActionMenu({
  items,
  trigger,
  align = "right",
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={menuRef} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="p-1 rounded hover:bg-gray-100 text-gray-500"
      >
        {trigger || (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="8" cy="3" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="8" cy="13" r="1.5" />
          </svg>
        )}
      </button>
      {open && (
        <div
          className={`absolute z-50 mt-1 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 py-1 ${align === "right" ? "right-0" : "left-0"}`}
        >
          {items.map((item, i) => (
            <React.Fragment key={i}>
              {item.divider && (
                <div className="my-1 border-t border-gray-100" />
              )}
              <button
                onClick={() => {
                  item.onClick();
                  setOpen(false);
                }}
                disabled={item.disabled}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${item.destructive ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50"} disabled:opacity-50`}
              >
                {item.icon}
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

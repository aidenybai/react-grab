"use client";

import * as React from "react";

interface PopoverProps {
  children: React.ReactNode;
}

interface PopoverContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const PopoverContext = React.createContext<PopoverContextType>({
  open: false,
  setOpen: () => {},
  triggerRef: { current: null },
});

export function Popover({ children }: PopoverProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <PopoverContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  );
}

export function PopoverTrigger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { setOpen, open, triggerRef } = React.useContext(PopoverContext);
  return (
    <button
      ref={triggerRef}
      className={className}
      onClick={() => setOpen(!open)}
      aria-expanded={open}
    >
      {children}
    </button>
  );
}

export function PopoverContent({
  children,
  className,
  align = "center",
  sideOffset = 4,
}: {
  children: React.ReactNode;
  className?: string;
  align?: "start" | "center" | "end";
  sideOffset?: number;
}) {
  const { open } = React.useContext(PopoverContext);
  if (!open) return null;

  const alignClass =
    align === "start"
      ? "left-0"
      : align === "end"
        ? "right-0"
        : "left-1/2 -translate-x-1/2";

  return (
    <div
      className={`absolute z-50 w-72 rounded-md border bg-white p-4 shadow-md outline-none ${alignClass} ${className ?? ""}`}
      style={{ marginTop: sideOffset }}
    >
      {children}
    </div>
  );
}

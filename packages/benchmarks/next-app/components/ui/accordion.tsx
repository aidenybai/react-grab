"use client";

import * as React from "react";

interface AccordionItemData {
  openItems: Set<string>;
  toggleItem: (value: string) => void;
  type: "single" | "multiple";
}

const AccordionContext = React.createContext<AccordionItemData>({
  openItems: new Set(),
  toggleItem: () => {},
  type: "single",
});

interface AccordionProps {
  type?: "single" | "multiple";
  defaultValue?: string[];
  className?: string;
  children: React.ReactNode;
}

export function Accordion({
  type = "single",
  defaultValue = [],
  className,
  children,
}: AccordionProps) {
  const [openItems, setOpenItems] = React.useState<Set<string>>(
    new Set(defaultValue),
  );

  const toggleItem = React.useCallback(
    (value: string) => {
      setOpenItems((prev) => {
        const next = new Set(prev);
        if (next.has(value)) {
          next.delete(value);
        } else {
          if (type === "single") next.clear();
          next.add(value);
        }
        return next;
      });
    },
    [type],
  );

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem, type }}>
      <div className={className}>{children}</div>
    </AccordionContext.Provider>
  );
}

export function AccordionItem({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`border-b ${className ?? ""}`} data-value={value}>
      {children}
    </div>
  );
}

export function AccordionTrigger({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { openItems, toggleItem } = React.useContext(AccordionContext);
  const isOpen = openItems.has(value);

  return (
    <button
      className={`flex w-full items-center justify-between py-4 font-medium transition-all hover:underline ${className ?? ""}`}
      onClick={() => toggleItem(value)}
      aria-expanded={isOpen}
    >
      {children}
      <svg
        className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  );
}

export function AccordionContent({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { openItems } = React.useContext(AccordionContext);
  if (!openItems.has(value)) return null;

  return (
    <div className={`overflow-hidden pb-4 pt-0 text-sm ${className ?? ""}`}>
      {children}
    </div>
  );
}

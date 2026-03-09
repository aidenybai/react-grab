"use client";
import React, { useState } from "react";

const navItems = [
  { label: "Dashboard", href: "#", active: true },
  { label: "Analytics", href: "#" },
  { label: "Reports", href: "#" },
  { label: "Settings", href: "#" },
];

export function TwNav({ "data-testid": testId }: { "data-testid"?: string }) {
  const [active, setActive] = useState("Dashboard");

  return (
    <nav
      data-testid={testId}
      className="flex items-center gap-1 rounded-lg bg-[var(--muted)] p-1"
    >
      {navItems.map((item) => (
        <button
          key={item.label}
          onClick={() => setActive(item.label)}
          data-testid={active === item.label ? "tw-nav-active" : undefined}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            active === item.label
              ? "bg-[var(--background)] text-[var(--foreground)] shadow-sm"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

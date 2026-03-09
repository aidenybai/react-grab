"use client";

import React from "react";

interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  badge?: string;
  active?: boolean;
}

interface DashboardNavProps {
  items: NavItem[];
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function DashboardNav({
  items,
  orientation = "horizontal",
  className,
}: DashboardNavProps) {
  const isVertical = orientation === "vertical";

  return (
    <nav
      className={`${isVertical ? "flex flex-col space-y-1" : "flex items-center space-x-4"} ${className ?? ""}`}
    >
      {items.map((item, index) => (
        <a
          key={index}
          href={item.href}
          className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            item.active
              ? "bg-gray-100 text-gray-900"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          } ${isVertical ? "w-full" : ""}`}
        >
          {item.icon && <span className="mr-2 h-4 w-4">{item.icon}</span>}
          <span>{item.label}</span>
          {item.badge && (
            <span className="ml-auto inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
              {item.badge}
            </span>
          )}
        </a>
      ))}
    </nav>
  );
}

export default DashboardNav;

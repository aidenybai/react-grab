"use client";

import React, { useState } from "react";

interface SidebarSection {
  title: string;
  items: {
    label: string;
    href: string;
    icon?: string;
    count?: number;
  }[];
}

interface DashboardSidebarProps {
  sections: SidebarSection[];
  collapsed?: boolean;
  onToggle?: () => void;
  className?: string;
}

export function DashboardSidebar({
  sections,
  collapsed: controlledCollapsed,
  onToggle,
  className,
}: DashboardSidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = controlledCollapsed ?? internalCollapsed;

  const handleToggle = () => {
    setInternalCollapsed(!collapsed);
    onToggle?.();
  };

  return (
    <aside
      className={`flex flex-col border-r bg-white transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      } ${className ?? ""}`}
    >
      <div className="flex h-14 items-center justify-between border-b px-4">
        {!collapsed && <span className="text-lg font-semibold">Dashboard</span>}
        <button
          onClick={handleToggle}
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "\u00BB" : "\u00AB"}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="mb-4">
            {!collapsed && (
              <h3 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                {section.title}
              </h3>
            )}
            {section.items.map((item, iIdx) => (
              <a
                key={iIdx}
                href={item.href}
                className="flex items-center px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                title={collapsed ? item.label : undefined}
              >
                {item.icon && (
                  <span className="mr-3 text-base">{item.icon}</span>
                )}
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.count !== undefined && (
                      <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {item.count}
                      </span>
                    )}
                  </>
                )}
              </a>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}

export default DashboardSidebar;

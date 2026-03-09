"use client";

import React from "react";

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function FormSection({
  title,
  description,
  children,
  collapsible = false,
  defaultCollapsed = false,
}: FormSectionProps) {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);

  return (
    <fieldset className="border-0 p-0 m-0">
      <div
        className={`flex items-center justify-between pb-4 border-b border-gray-200 ${collapsible ? "cursor-pointer select-none" : ""}`}
        onClick={collapsible ? () => setCollapsed(!collapsed) : undefined}
      >
        <div>
          <legend className="text-base font-semibold text-gray-900">
            {title}
          </legend>
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
        </div>
        {collapsible && (
          <span
            className={`text-gray-400 transition-transform ${collapsed ? "" : "rotate-180"}`}
          >
            &#9660;
          </span>
        )}
      </div>
      {!collapsed && <div className="mt-6 space-y-6">{children}</div>}
    </fieldset>
  );
}

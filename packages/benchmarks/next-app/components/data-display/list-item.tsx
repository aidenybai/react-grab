"use client";

import React from "react";

interface ListItemProps {
  title: string;
  description?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  divider?: boolean;
}

export function ListItem({
  title,
  description,
  leading,
  trailing,
  onClick,
  selected = false,
  disabled = false,
  divider = true,
}: ListItemProps) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`flex items-center gap-3 px-4 py-3 ${divider ? "border-b border-gray-100 last:border-0" : ""} ${onClick && !disabled ? "cursor-pointer hover:bg-gray-50" : ""} ${selected ? "bg-blue-50" : ""} ${disabled ? "opacity-50 cursor-default" : ""}`}
    >
      {leading && <div className="flex-shrink-0">{leading}</div>}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${selected ? "text-blue-700" : "text-gray-900"}`}
        >
          {title}
        </p>
        {description && (
          <p className="text-xs text-gray-500 truncate mt-0.5">{description}</p>
        )}
      </div>
      {trailing && (
        <div className="flex-shrink-0 text-gray-400">{trailing}</div>
      )}
    </div>
  );
}

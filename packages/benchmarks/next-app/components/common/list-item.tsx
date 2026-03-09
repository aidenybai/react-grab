"use client";

import React from "react";

interface ListItemProps {
  title: string;
  description?: string;
  avatar?: React.ReactNode;
  meta?: string;
  actions?: React.ReactNode;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export function ListItem({
  title,
  description,
  avatar,
  meta,
  actions,
  selected = false,
  disabled = false,
  onClick,
  className,
}: ListItemProps) {
  return (
    <div
      className={`flex items-center gap-3 border-b px-4 py-3 transition-colors last:border-b-0 ${
        onClick ? "cursor-pointer" : ""
      } ${selected ? "bg-indigo-50" : "hover:bg-gray-50"} ${
        disabled ? "pointer-events-none opacity-50" : ""
      } ${className ?? ""}`}
      onClick={disabled ? undefined : onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
    >
      {avatar && <div className="flex-shrink-0">{avatar}</div>}
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-medium ${selected ? "text-indigo-900" : "text-gray-900"}`}
        >
          {title}
        </p>
        {description && (
          <p className="mt-0.5 truncate text-xs text-gray-500">{description}</p>
        )}
      </div>
      {meta && (
        <span className="flex-shrink-0 text-xs text-gray-400">{meta}</span>
      )}
      {actions && <div className="flex-shrink-0">{actions}</div>}
    </div>
  );
}

export function ListItemSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-center gap-3 border-b px-4 py-3 last:border-b-0 ${className ?? ""}`}
    >
      <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-1/3 animate-pulse rounded bg-gray-200" />
        <div className="h-2.5 w-2/3 animate-pulse rounded bg-gray-200" />
      </div>
    </div>
  );
}

export default ListItem;

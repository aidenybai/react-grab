"use client";

import React from "react";

type StatusType = "active" | "inactive" | "pending" | "error" | "archived";

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  withDot?: boolean;
  className?: string;
}

const statusConfig: Record<
  StatusType,
  { bg: string; text: string; dot: string; defaultLabel: string }
> = {
  active: {
    bg: "bg-green-50",
    text: "text-green-700",
    dot: "bg-green-500",
    defaultLabel: "Active",
  },
  inactive: {
    bg: "bg-gray-50",
    text: "text-gray-600",
    dot: "bg-gray-400",
    defaultLabel: "Inactive",
  },
  pending: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    dot: "bg-yellow-500",
    defaultLabel: "Pending",
  },
  error: {
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-500",
    defaultLabel: "Error",
  },
  archived: {
    bg: "bg-slate-50",
    text: "text-slate-600",
    dot: "bg-slate-400",
    defaultLabel: "Archived",
  },
};

export function Badge({
  status,
  label,
  withDot = true,
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const displayLabel = label || config.defaultLabel;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.bg} ${config.text} ${className || ""}`}
    >
      {withDot && <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />}
      {displayLabel}
    </span>
  );
}

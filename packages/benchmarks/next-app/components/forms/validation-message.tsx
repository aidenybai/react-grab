"use client";

import React from "react";

type ValidationSeverity = "error" | "warning" | "info" | "success";

interface ValidationMessageProps {
  message: string;
  severity?: ValidationSeverity;
  icon?: boolean;
  className?: string;
}

const severityConfig: Record<
  ValidationSeverity,
  { color: string; bgColor: string; symbol: string }
> = {
  error: { color: "text-red-600", bgColor: "bg-red-50", symbol: "\u2716" },
  warning: {
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    symbol: "\u26A0",
  },
  info: { color: "text-blue-600", bgColor: "bg-blue-50", symbol: "\u2139" },
  success: {
    color: "text-green-600",
    bgColor: "bg-green-50",
    symbol: "\u2714",
  },
};

export function ValidationMessage({
  message,
  severity = "error",
  icon = true,
  className,
}: ValidationMessageProps) {
  const config = severityConfig[severity];

  return (
    <div
      className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs ${config.color} ${config.bgColor} ${className || ""}`}
      role={severity === "error" ? "alert" : "status"}
    >
      {icon && <span aria-hidden="true">{config.symbol}</span>}
      <span>{message}</span>
    </div>
  );
}

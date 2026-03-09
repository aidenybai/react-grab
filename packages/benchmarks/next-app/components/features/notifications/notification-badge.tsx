"use client";

import React from "react";

interface NotificationBadgeProps {
  count: number;
  maxCount?: number;
  showZero?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "dot";
  children?: React.ReactNode;
  className?: string;
}

const sizeStyles = {
  sm: "h-4 min-w-[16px] text-[10px]",
  md: "h-5 min-w-[20px] text-xs",
  lg: "h-6 min-w-[24px] text-sm",
};

export function NotificationBadge({
  count,
  maxCount = 99,
  showZero = false,
  size = "md",
  variant = "default",
  children,
  className,
}: NotificationBadgeProps) {
  const shouldShow = count > 0 || showZero;
  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  if (!children) {
    if (!shouldShow) return null;

    if (variant === "dot") {
      return (
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full bg-red-500 ${className ?? ""}`}
        />
      );
    }

    return (
      <span
        className={`inline-flex items-center justify-center rounded-full bg-red-500 px-1.5 font-medium text-white ${sizeStyles[size]} ${className ?? ""}`}
      >
        {displayCount}
      </span>
    );
  }

  return (
    <div className={`relative inline-flex ${className ?? ""}`}>
      {children}
      {shouldShow &&
        (variant === "dot" ? (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
        ) : (
          <span
            className={`absolute -right-1.5 -top-1.5 flex items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 font-medium text-white ${sizeStyles[size]}`}
          >
            {displayCount}
          </span>
        ))}
    </div>
  );
}

export default NotificationBadge;

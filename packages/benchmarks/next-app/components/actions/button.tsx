"use client";

import React, { memo, useCallback } from "react";

type ActionVariant = "primary" | "secondary" | "destructive" | "success";

interface ActionButtonProps {
  variant?: ActionVariant;
  label: string;
  onClick: () => void | Promise<void>;
  icon?: React.ReactNode;
  confirmMessage?: string;
  disabled?: boolean;
  size?: "xs" | "sm" | "md";
}

export const Button = memo(function ActionButton({
  variant = "primary",
  label,
  onClick,
  icon,
  confirmMessage,
  disabled = false,
  size = "md",
}: ActionButtonProps) {
  const handleClick = useCallback(async () => {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    await onClick();
  }, [onClick, confirmMessage]);

  const variantClasses: Record<ActionVariant, string> = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50",
    destructive: "bg-red-600 text-white hover:bg-red-700",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
  };

  const sizeClasses = {
    xs: "h-7 px-2 text-xs gap-1",
    sm: "h-8 px-3 text-xs gap-1.5",
    md: "h-9 px-4 text-sm gap-2",
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-md font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]}`}
    >
      {icon}
      {label}
    </button>
  );
});

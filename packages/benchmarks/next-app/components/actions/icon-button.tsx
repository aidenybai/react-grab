"use client";

import React from "react";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "outlined" | "filled";
  rounded?: boolean;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      label,
      size = "md",
      variant = "ghost",
      rounded = true,
      className,
      ...props
    },
    ref,
  ) => {
    const sizeClasses = { sm: "h-7 w-7", md: "h-9 w-9", lg: "h-11 w-11" };
    const variantClasses = {
      ghost: "hover:bg-gray-100 text-gray-600",
      outlined: "border border-gray-300 hover:bg-gray-50 text-gray-600",
      filled: "bg-gray-100 hover:bg-gray-200 text-gray-700",
    };

    return (
      <button
        ref={ref}
        aria-label={label}
        className={`inline-flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 disabled:opacity-50 ${sizeClasses[size]} ${variantClasses[variant]} ${rounded ? "rounded-full" : "rounded-md"} ${className || ""}`}
        {...props}
      >
        {icon}
      </button>
    );
  },
);

IconButton.displayName = "IconButton";

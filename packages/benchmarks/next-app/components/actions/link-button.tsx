"use client";

import React from "react";

interface LinkButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: "default" | "muted" | "danger";
  external?: boolean;
  underline?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export function LinkButton({
  href,
  children,
  variant = "default",
  external = false,
  underline = false,
  icon,
  className,
}: LinkButtonProps) {
  const variantClasses = {
    default: "text-blue-600 hover:text-blue-800",
    muted: "text-gray-500 hover:text-gray-700",
    danger: "text-red-600 hover:text-red-800",
  };

  return (
    <a
      href={href}
      className={`inline-flex items-center gap-1 text-sm font-medium transition-colors ${variantClasses[variant]} ${underline ? "underline underline-offset-2" : "hover:underline"} ${className || ""}`}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {icon}
      {children}
      {external && (
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M3.5 3h5.5v5.5M9 3L3 9" />
        </svg>
      )}
    </a>
  );
}

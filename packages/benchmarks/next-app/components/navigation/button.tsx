"use client";

import React from "react";

interface NavButtonProps {
  href: string;
  active?: boolean;
  icon?: React.ReactNode;
  badge?: number;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}

export function Button({
  href,
  active = false,
  icon,
  badge,
  children,
  onClick,
}: NavButtonProps) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={`relative inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
        active
          ? "bg-gray-100 text-gray-900"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      {icon && <span className="flex-shrink-0 w-5 h-5">{icon}</span>}
      {children}
      {badge !== undefined && badge > 0 && (
        <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-blue-100 text-blue-600 text-[11px] font-semibold">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </a>
  );
}

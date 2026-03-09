"use client";

import React from "react";

interface NavItemProps {
  label: string;
  href: string;
  icon?: React.ReactNode;
  active?: boolean;
  badge?: string | number;
  indent?: number;
  collapsed?: boolean;
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

export function NavItem({
  label,
  href,
  icon,
  active = false,
  badge,
  indent = 0,
  collapsed = false,
  children,
  onClick,
  className,
}: NavItemProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const hasChildren = React.Children.count(children) > 0;

  const handleClick = (e: React.MouseEvent) => {
    if (hasChildren) {
      e.preventDefault();
      setIsExpanded(!isExpanded);
    }
    onClick?.(e);
  };

  return (
    <div className={className}>
      <a
        href={href}
        onClick={handleClick}
        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          active
            ? "bg-indigo-50 text-indigo-700"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        }`}
        style={{ paddingLeft: `${12 + indent * 16}px` }}
        title={collapsed ? label : undefined}
      >
        {icon && (
          <span className="flex h-5 w-5 items-center justify-center text-current">
            {icon}
          </span>
        )}
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{label}</span>
            {badge !== undefined && (
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                {badge}
              </span>
            )}
            {hasChildren && (
              <svg
                className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            )}
          </>
        )}
      </a>
      {hasChildren && isExpanded && !collapsed && (
        <div className="mt-0.5">{children}</div>
      )}
    </div>
  );
}

export default NavItem;

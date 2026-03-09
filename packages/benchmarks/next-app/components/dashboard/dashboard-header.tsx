"use client";

import React from "react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface DashboardHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

export function DashboardHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: DashboardHeaderProps) {
  return (
    <div className={`border-b bg-white px-6 py-4 ${className ?? ""}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-2 flex items-center space-x-1 text-sm text-gray-500">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span className="mx-1">/</span>}
              {crumb.href ? (
                <a
                  href={crumb.href}
                  className="hover:text-gray-700 hover:underline"
                >
                  {crumb.label}
                </a>
              ) : (
                <span className="text-gray-900">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export default DashboardHeader;

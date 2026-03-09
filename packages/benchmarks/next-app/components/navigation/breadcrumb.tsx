"use client";

import React from "react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  maxItems?: number;
  className?: string;
}

export function Breadcrumb({
  items,
  separator,
  maxItems,
  className,
}: BreadcrumbProps) {
  let displayItems = items;

  if (maxItems && items.length > maxItems) {
    displayItems = [
      items[0],
      { label: "..." },
      ...items.slice(-(maxItems - 1)),
    ];
  }

  const defaultSeparator = (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M6 4l4 4-4 4" />
    </svg>
  );

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          listStyle: "none",
          margin: 0,
          padding: 0,
        }}
      >
        {displayItems.map((item, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <li style={{ color: "#9CA3AF", display: "flex" }}>
                {separator || defaultSeparator}
              </li>
            )}
            <li>
              {item.href && i < displayItems.length - 1 ? (
                <a
                  href={item.href}
                  style={{
                    fontSize: 13,
                    color: "#6B7280",
                    textDecoration: "none",
                  }}
                >
                  {item.label}
                </a>
              ) : (
                <span
                  style={{
                    fontSize: 13,
                    color:
                      i === displayItems.length - 1 ? "#111827" : "#6B7280",
                    fontWeight: i === displayItems.length - 1 ? 500 : 400,
                  }}
                >
                  {item.label}
                </span>
              )}
            </li>
          </React.Fragment>
        ))}
      </ol>
    </nav>
  );
}

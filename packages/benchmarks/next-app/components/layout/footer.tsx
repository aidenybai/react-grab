"use client";

import React from "react";

interface FooterLink {
  label: string;
  href: string;
}

interface FooterProps {
  copyright?: string;
  links?: FooterLink[];
  children?: React.ReactNode;
  bordered?: boolean;
}

export function Footer({
  copyright,
  links,
  children,
  bordered = true,
}: FooterProps) {
  return (
    <footer
      style={{
        padding: "24px 16px",
        borderTop: bordered ? "1px solid #E5E7EB" : "none",
        backgroundColor: "#FAFAFA",
      }}
    >
      {children}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        {copyright && (
          <span style={{ fontSize: 13, color: "#9CA3AF" }}>{copyright}</span>
        )}
        {links && (
          <nav style={{ display: "flex", gap: 16 }}>
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                style={{
                  fontSize: 13,
                  color: "#6B7280",
                  textDecoration: "none",
                }}
              >
                {link.label}
              </a>
            ))}
          </nav>
        )}
      </div>
    </footer>
  );
}

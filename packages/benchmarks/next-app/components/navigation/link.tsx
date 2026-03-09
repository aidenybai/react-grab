"use client";

import React from "react";

interface NavLinkProps {
  href: string;
  active?: boolean;
  children: React.ReactNode;
  variant?: "default" | "underline" | "pill";
  external?: boolean;
  className?: string;
}

export function Link({
  href,
  active = false,
  children,
  variant = "default",
  external = false,
  className,
}: NavLinkProps) {
  const variants = {
    default: active
      ? "text-gray-900 font-semibold"
      : "text-gray-500 hover:text-gray-900",
    underline: `${active ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 border-b-2 border-transparent hover:text-gray-700 hover:border-gray-300"} pb-3`,
    pill: `px-3 py-1.5 rounded-full text-sm ${active ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`,
  };

  return (
    <a
      href={href}
      className={`inline-flex items-center gap-1 text-sm transition-colors ${variants[variant]} ${className || ""}`}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

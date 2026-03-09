"use client";

import React from "react";

interface SettingsCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  variant?: "default" | "danger";
  className?: string;
}

export function SettingsCard({
  title,
  description,
  children,
  footer,
  variant = "default",
  className,
}: SettingsCardProps) {
  const borderColor =
    variant === "danger" ? "border-red-200" : "border-gray-200";
  const headerColor = variant === "danger" ? "text-red-900" : "text-gray-900";

  return (
    <div
      className={`overflow-hidden rounded-lg border ${borderColor} bg-white ${className ?? ""}`}
    >
      <div className="px-6 py-4">
        <h3 className={`text-base font-semibold ${headerColor}`}>{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
      <div className="border-t px-6 py-4">{children}</div>
      {footer && (
        <div className="flex items-center justify-end border-t bg-gray-50 px-6 py-3">
          {footer}
        </div>
      )}
    </div>
  );
}

export function SettingsCardGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`space-y-6 ${className ?? ""}`}>{children}</div>;
}

export default SettingsCard;

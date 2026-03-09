"use client";

import React from "react";

interface FieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  description?: string;
  children: React.ReactNode;
  horizontal?: boolean;
}

export function Field({
  label,
  htmlFor,
  required = false,
  error,
  description,
  children,
  horizontal = false,
}: FieldProps) {
  return (
    <div
      className={`${horizontal ? "flex items-start gap-4" : "flex flex-col gap-1.5"}`}
    >
      <div className={horizontal ? "w-1/3 pt-2" : ""}>
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      <div className={horizontal ? "flex-1" : ""}>
        {children}
        {error && (
          <p className="text-xs text-red-500 mt-1" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

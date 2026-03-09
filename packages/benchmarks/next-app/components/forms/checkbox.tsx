"use client";

import React from "react";

interface FormCheckboxProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label: string;
  name?: string;
  description?: string;
  error?: string;
  disabled?: boolean;
}

export const Checkbox = React.forwardRef<HTMLInputElement, FormCheckboxProps>(
  ({ checked, onChange, label, name, description, error, disabled }, ref) => {
    return (
      <div className="relative flex items-start">
        <div className="flex h-6 items-center">
          <input
            ref={ref}
            type="checkbox"
            name={name}
            checked={checked}
            onChange={(e) => onChange?.(e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>
        <div className="ml-3">
          <label
            className={`text-sm font-medium ${disabled ? "text-gray-400" : "text-gray-700"}`}
          >
            {label}
          </label>
          {description && (
            <p className="text-xs text-gray-500">{description}</p>
          )}
          {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
        </div>
      </div>
    );
  },
);

Checkbox.displayName = "FormCheckbox";

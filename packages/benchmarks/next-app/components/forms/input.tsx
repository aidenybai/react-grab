"use client";

import React from "react";

interface FormInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size"
> {
  label: string;
  error?: string;
  hint?: string;
  size?: "sm" | "md" | "lg";
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      label,
      error,
      hint,
      size = "md",
      startAdornment,
      endAdornment,
      id,
      required,
      className,
      ...props
    },
    ref,
  ) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, "-");
    const sizeClasses = {
      sm: "h-8 text-xs px-2",
      md: "h-10 text-sm px-3",
      lg: "h-12 text-base px-4",
    };

    return (
      <div className={`flex flex-col gap-1 ${className || ""}`}>
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <div className="relative flex items-center">
          {startAdornment && (
            <div className="absolute left-3 text-gray-400">
              {startAdornment}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full rounded-md border ${error ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"} focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:bg-gray-50 disabled:text-gray-400 ${sizeClasses[size]} ${startAdornment ? "pl-9" : ""} ${endAdornment ? "pr-9" : ""}`}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
            }
            required={required}
            {...props}
          />
          {endAdornment && (
            <div className="absolute right-3 text-gray-400">{endAdornment}</div>
          )}
        </div>
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-xs text-red-500"
            role="alert"
          >
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-xs text-gray-500">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "FormInput";

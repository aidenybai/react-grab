"use client";

import React from "react";

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
  maxLength?: number;
  showCount?: boolean;
}

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  FormTextareaProps
>(
  (
    {
      label,
      error,
      hint,
      maxLength,
      showCount = false,
      value,
      id,
      required,
      ...props
    },
    ref,
  ) => {
    const textareaId = id || label.toLowerCase().replace(/\s+/g, "-");
    const charCount = typeof value === "string" ? value.length : 0;

    return (
      <div className="flex flex-col gap-1">
        <label
          htmlFor={textareaId}
          className="text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <textarea
          ref={ref}
          id={textareaId}
          value={value}
          maxLength={maxLength}
          className={`w-full min-h-[100px] rounded-md border ${error ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"} px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 resize-y disabled:bg-gray-50`}
          required={required}
          {...props}
        />
        <div className="flex justify-between">
          {error && <p className="text-xs text-red-500">{error}</p>}
          {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
          {showCount && maxLength && (
            <span
              className={`text-xs ml-auto ${charCount > maxLength * 0.9 ? "text-orange-500" : "text-gray-400"}`}
            >
              {charCount}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  },
);

Textarea.displayName = "FormTextarea";

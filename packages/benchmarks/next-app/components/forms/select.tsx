"use client";

import React from "react";

interface FormSelectOption {
  value: string;
  label: string;
  group?: string;
}

interface FormSelectProps extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "size"
> {
  label: string;
  options: FormSelectOption[];
  error?: string;
  placeholder?: string;
  size?: "sm" | "md" | "lg";
}

export const Select = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  (
    { label, options, error, placeholder, size = "md", id, required, ...props },
    ref,
  ) => {
    const selectId = id || label.toLowerCase().replace(/\s+/g, "-");
    const sizeClasses = {
      sm: "h-8 text-xs",
      md: "h-10 text-sm",
      lg: "h-12 text-base",
    };

    const grouped = options.reduce<Record<string, FormSelectOption[]>>(
      (acc, opt) => {
        const key = opt.group || "__ungrouped";
        if (!acc[key]) acc[key] = [];
        acc[key].push(opt);
        return acc;
      },
      {},
    );

    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={selectId} className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <select
          ref={ref}
          id={selectId}
          className={`w-full rounded-md border ${error ? "border-red-500" : "border-gray-300"} bg-white px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 ${sizeClasses[size]}`}
          required={required}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {Object.entries(grouped).map(([group, opts]) =>
            group === "__ungrouped" ? (
              opts.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))
            ) : (
              <optgroup key={group} label={group}>
                {opts.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            ),
          )}
        </select>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  },
);

Select.displayName = "FormSelect";

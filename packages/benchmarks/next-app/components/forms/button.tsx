"use client";

import React from "react";

interface FormButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "submit" | "reset" | "cancel";
  pending?: boolean;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, FormButtonProps>(
  (
    {
      variant = "submit",
      pending = false,
      fullWidth = false,
      children,
      disabled,
      className,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all duration-150";
    const variantStyles = {
      submit:
        "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm",
      reset: "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300",
      cancel:
        "bg-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50",
    };

    return (
      <button
        ref={ref}
        type={variant === "submit" ? "submit" : "button"}
        disabled={disabled || pending}
        className={`${baseStyles} ${variantStyles[variant]} ${fullWidth ? "w-full" : ""} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className || ""}`}
        {...props}
      >
        {pending && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "FormButton";

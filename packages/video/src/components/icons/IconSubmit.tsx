import type React from "react";

interface IconSubmitProps {
  size?: number;
  className?: string;
}

export const IconSubmit: React.FC<IconSubmitProps> = ({ size = 12, className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      className={className}
    >
      <path
        d="M6 1L6 11M6 1L2 5M6 1L10 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

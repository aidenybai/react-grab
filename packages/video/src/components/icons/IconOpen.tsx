import type React from "react";

interface IconOpenProps {
  size?: number;
  className?: string;
}

export const IconOpen: React.FC<IconOpenProps> = ({ size = 12, className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      className={className}
    >
      <path d="M12 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
      <path d="M11 13l9-9" />
      <path d="M15 4h5v5" />
    </svg>
  );
};

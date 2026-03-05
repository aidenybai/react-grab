import type React from "react";

interface IconEllipsisProps {
  size?: number;
  className?: string;
}

export const IconEllipsis: React.FC<IconEllipsisProps> = ({ size = 12, className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
};

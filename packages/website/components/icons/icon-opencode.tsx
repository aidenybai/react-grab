interface IconOpenCodeProps {
  width?: number;
  height?: number;
  className?: string;
}

export const IconOpenCode = ({
  width = 16,
  height = 20,
  className = "",
}: IconOpenCodeProps) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 32 40"
    fill="none"
    className={className}
  >
    <g clipPath="url(#clip0_1311_94973)">
      <path d="M24 32H8V16H24V32Z" fill="#4B4646" />
      <path d="M24 8H8V32H24V8ZM32 40H0V0H32V40Z" fill="#F1ECEC" />
    </g>
    <defs>
      <clipPath id="clip0_1311_94973">
        <rect width="32" height="40" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

IconOpenCode.displayName = "IconOpenCode";

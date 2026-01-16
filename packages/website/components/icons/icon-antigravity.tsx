interface IconAntigravityProps {
  width?: number;
  height?: number;
  className?: string;
}

export const IconAntigravity = ({
  width = 16,
  height = 16,
  className,
}: IconAntigravityProps) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M12 2L2 19h20L12 2zm0 4l6.5 11h-13L12 6z" />
    <circle cx="12" cy="14" r="2" />
  </svg>
);

IconAntigravity.displayName = "IconAntigravity";

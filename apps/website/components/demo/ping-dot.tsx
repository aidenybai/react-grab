interface PingDotProps {
  sizeClass?: string;
}

export const PingDot = ({ sizeClass = "size-2" }: PingDotProps) => (
  <span className={`relative flex ${sizeClass}`}>
    <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60" />
    <span className={`relative inline-flex ${sizeClass} rounded-full bg-brand`} />
  </span>
);

PingDot.displayName = "PingDot";

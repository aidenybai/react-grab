"use client";

interface AvailabilityTimeRangeProps {
  start: string;
  end: string;
  onStartChange?: (value: string) => void;
  onEndChange?: (value: string) => void;
  onRemove?: () => void;
  error?: string;
}

export function AvailabilityTimeRange({
  start,
  end,
  onStartChange,
  onEndChange,
  onRemove,
  error,
}: AvailabilityTimeRangeProps) {
  return (
    <div
      className={`availability-time-range ${error ? "availability-time-range--error" : ""}`}
    >
      <input
        type="time"
        value={start}
        onChange={(e) => onStartChange?.(e.target.value)}
        className="availability-time-range__input"
      />
      <span className="availability-time-range__separator">—</span>
      <input
        type="time"
        value={end}
        onChange={(e) => onEndChange?.(e.target.value)}
        className="availability-time-range__input"
      />
      {onRemove && (
        <button className="availability-time-range__remove" onClick={onRemove}>
          ×
        </button>
      )}
      {error && <span className="availability-time-range__error">{error}</span>}
    </div>
  );
}

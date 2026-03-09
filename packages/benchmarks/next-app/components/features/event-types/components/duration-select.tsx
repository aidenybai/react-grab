"use client";

interface DurationSelectProps {
  value: number;
  onChange?: (duration: number) => void;
  options?: number[];
  allowCustom?: boolean;
  label?: string;
}

const DEFAULT_DURATIONS = [15, 30, 45, 60, 90, 120];

export function DurationSelect({
  value,
  onChange,
  options = DEFAULT_DURATIONS,
  allowCustom = true,
  label = "Duration",
}: DurationSelectProps) {
  const isCustom = !options.includes(value);

  return (
    <div className="duration-select">
      <label className="duration-select__label">{label}</label>
      <div className="duration-select__options">
        {options.map((dur) => (
          <button
            key={dur}
            className={`duration-select__option ${value === dur ? "duration-select__option--selected" : ""}`}
            onClick={() => onChange?.(dur)}
          >
            {dur} min
          </button>
        ))}
        {allowCustom && (
          <input
            type="number"
            className="duration-select__custom"
            value={isCustom ? value : ""}
            placeholder="Custom"
            min={5}
            onChange={(e) => onChange?.(Number(e.target.value))}
          />
        )}
      </div>
    </div>
  );
}

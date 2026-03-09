"use client";

import { useMemo } from "react";

interface TimezoneSelectProps {
  value: string;
  onChange?: (timezone: string) => void;
  label?: string;
}

const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export function TimezoneSelect({
  value,
  onChange,
  label = "Timezone",
}: TimezoneSelectProps) {
  const options = useMemo(() => {
    return COMMON_TIMEZONES.map((tz) => {
      const offset =
        new Intl.DateTimeFormat("en", { timeZone: tz, timeZoneName: "short" })
          .formatToParts(new Date())
          .find((p) => p.type === "timeZoneName")?.value ?? "";
      return { value: tz, label: `${tz.replace(/_/g, " ")} (${offset})` };
    });
  }, []);

  return (
    <div className="timezone-select">
      <label className="timezone-select__label">{label}</label>
      <select
        className="timezone-select__input"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

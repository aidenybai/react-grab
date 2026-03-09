"use client";

import { useState } from "react";

interface LocationOption {
  type: string;
  label: string;
  value?: string;
  icon?: string;
}

interface LocationSelectProps {
  selected?: LocationOption;
  onChange?: (location: LocationOption) => void;
}

const LOCATION_OPTIONS: LocationOption[] = [
  { type: "in_person", label: "In-Person Meeting" },
  { type: "phone", label: "Phone Call" },
  { type: "google_meet", label: "Google Meet" },
  { type: "zoom", label: "Zoom" },
  { type: "teams", label: "Microsoft Teams" },
  { type: "custom", label: "Custom Location" },
];

export function LocationSelect({ selected, onChange }: LocationSelectProps) {
  const [customValue, setCustomValue] = useState("");

  return (
    <div className="location-select">
      <label className="location-select__label">Location</label>
      <div className="location-select__options">
        {LOCATION_OPTIONS.map((opt) => (
          <button
            key={opt.type}
            className={`location-select__option ${selected?.type === opt.type ? "location-select__option--selected" : ""}`}
            onClick={() => onChange?.(opt)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {selected?.type === "custom" && (
        <input
          type="text"
          className="location-select__custom-input"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          placeholder="Enter location address or link"
        />
      )}
    </div>
  );
}

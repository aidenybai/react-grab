"use client";

import { useMemo } from "react";

interface PreviewSlot {
  time: string;
  available: boolean;
}

interface AvailabilityPreviewProps {
  date: Date;
  slots: PreviewSlot[];
  timezone: string;
}

export function AvailabilityPreview({
  date,
  slots,
  timezone,
}: AvailabilityPreviewProps) {
  const availableCount = useMemo(
    () => slots.filter((s) => s.available).length,
    [slots],
  );

  return (
    <div className="availability-preview">
      <h4 className="availability-preview__title">
        Preview: {date.toLocaleDateString()}
      </h4>
      <p className="availability-preview__timezone">Timezone: {timezone}</p>
      <p className="availability-preview__summary">
        {availableCount} of {slots.length} slots available
      </p>
      <div className="availability-preview__grid">
        {slots.map((slot) => (
          <div
            key={slot.time}
            className={`availability-preview__slot ${slot.available ? "availability-preview__slot--available" : "availability-preview__slot--unavailable"}`}
          >
            {slot.time}
          </div>
        ))}
      </div>
    </div>
  );
}

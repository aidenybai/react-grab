"use client";

import { useState } from "react";

interface RecurringConfigProps {
  enabled: boolean;
  frequency?: "daily" | "weekly" | "monthly";
  interval?: number;
  count?: number;
  onChange?: (config: {
    enabled: boolean;
    frequency: string;
    interval: number;
    count: number;
  }) => void;
}

export function RecurringConfig({
  enabled,
  frequency = "weekly",
  interval = 1,
  count = 12,
  onChange,
}: RecurringConfigProps) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [freq, setFreq] = useState(frequency);
  const [intv, setIntv] = useState(interval);
  const [cnt, setCnt] = useState(count);

  const handleToggle = () => {
    const next = !isEnabled;
    setIsEnabled(next);
    onChange?.({ enabled: next, frequency: freq, interval: intv, count: cnt });
  };

  return (
    <div className="recurring-config">
      <label className="recurring-config__toggle">
        <input type="checkbox" checked={isEnabled} onChange={handleToggle} />
        Enable recurring events
      </label>
      {isEnabled && (
        <div className="recurring-config__options">
          <div className="recurring-config__field">
            <label>Frequency</label>
            <select
              value={freq}
              onChange={(e) => setFreq(e.target.value as typeof freq)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="recurring-config__field">
            <label>Every</label>
            <input
              type="number"
              value={intv}
              onChange={(e) => setIntv(Number(e.target.value))}
              min={1}
              max={30}
            />
          </div>
          <div className="recurring-config__field">
            <label>Occurrences</label>
            <input
              type="number"
              value={cnt}
              onChange={(e) => setCnt(Number(e.target.value))}
              min={1}
              max={365}
            />
          </div>
        </div>
      )}
    </div>
  );
}

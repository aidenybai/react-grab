"use client";

import { useState } from "react";

interface TriggerOption {
  value: string;
  label: string;
  description: string;
  icon?: string;
}

interface WorkflowTriggerSelectProps {
  value?: string;
  onChange?: (value: string) => void;
  triggers?: TriggerOption[];
}

const DEFAULT_TRIGGERS: TriggerOption[] = [
  {
    value: "booking_created",
    label: "Booking Created",
    description: "When a new booking is made",
  },
  {
    value: "booking_cancelled",
    label: "Booking Cancelled",
    description: "When a booking is cancelled",
  },
  {
    value: "booking_rescheduled",
    label: "Booking Rescheduled",
    description: "When a booking is rescheduled",
  },
  {
    value: "form_submitted",
    label: "Form Submitted",
    description: "When a form is submitted",
  },
  {
    value: "new_attendee",
    label: "New Attendee",
    description: "When a new attendee is added",
  },
];

export function WorkflowTriggerSelect({
  value,
  onChange,
  triggers = DEFAULT_TRIGGERS,
}: WorkflowTriggerSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = triggers.find((t) => t.value === value);

  return (
    <div className="workflow-trigger-select">
      <label className="workflow-trigger-select__label">Trigger</label>
      <button
        className="workflow-trigger-select__button"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selected ? selected.label : "Select a trigger..."}
      </button>
      {isOpen && (
        <div className="workflow-trigger-select__dropdown">
          {triggers.map((trigger) => (
            <button
              key={trigger.value}
              className="workflow-trigger-select__option"
              onClick={() => {
                onChange?.(trigger.value);
                setIsOpen(false);
              }}
            >
              <span className="workflow-trigger-select__option-label">
                {trigger.label}
              </span>
              <span className="workflow-trigger-select__option-desc">
                {trigger.description}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

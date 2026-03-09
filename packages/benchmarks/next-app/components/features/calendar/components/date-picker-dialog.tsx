"use client";

import { useState, useCallback } from "react";

interface DatePickerDialogProps {
  isOpen: boolean;
  initialDate?: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
  minDate?: Date;
  maxDate?: Date;
}

export function DatePickerDialog({
  isOpen,
  initialDate,
  onConfirm,
  onCancel,
  minDate,
  maxDate,
}: DatePickerDialogProps) {
  const [selected, setSelected] = useState(initialDate ?? new Date());

  const handleConfirm = useCallback(() => {
    onConfirm(selected);
  }, [selected, onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="date-picker-dialog__overlay" onClick={onCancel}>
      <div className="date-picker-dialog" onClick={(e) => e.stopPropagation()}>
        <h2 className="date-picker-dialog__title">Select Date</h2>
        <input
          type="date"
          value={selected.toISOString().split("T")[0]}
          min={minDate?.toISOString().split("T")[0]}
          max={maxDate?.toISOString().split("T")[0]}
          onChange={(e) => setSelected(new Date(e.target.value))}
          className="date-picker-dialog__input"
        />
        <div className="date-picker-dialog__actions">
          <button className="btn btn-outline" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

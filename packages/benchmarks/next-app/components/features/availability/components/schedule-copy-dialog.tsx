"use client";

import { useState } from "react";

interface ScheduleCopyDialogProps {
  isOpen: boolean;
  schedules: Array<{ id: string; name: string }>;
  onCopy: (fromScheduleId: string, newName: string) => void;
  onClose: () => void;
}

export function ScheduleCopyDialog({
  isOpen,
  schedules,
  onCopy,
  onClose,
}: ScheduleCopyDialogProps) {
  const [selectedId, setSelectedId] = useState(schedules[0]?.id ?? "");
  const [newName, setNewName] = useState("");

  if (!isOpen) return null;

  return (
    <div className="schedule-copy-dialog__overlay" onClick={onClose}>
      <div
        className="schedule-copy-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Copy Schedule</h2>
        <div className="schedule-copy-dialog__field">
          <label>Copy from</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {schedules.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="schedule-copy-dialog__field">
          <label>New schedule name</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="My Schedule (Copy)"
          />
        </div>
        <div className="schedule-copy-dialog__actions">
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onCopy(selectedId, newName)}
            disabled={!newName.trim()}
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}

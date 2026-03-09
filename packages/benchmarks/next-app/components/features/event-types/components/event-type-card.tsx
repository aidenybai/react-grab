"use client";

import { memo } from "react";

interface EventTypeCardProps {
  title: string;
  slug: string;
  duration: number;
  description?: string;
  isActive: boolean;
  color?: string;
  onEdit?: () => void;
  onToggle?: () => void;
  onDuplicate?: () => void;
}

export const EventTypeCard = memo(function EventTypeCard({
  title,
  slug,
  duration,
  description,
  isActive,
  color = "#3b82f6",
  onEdit,
  onToggle,
  onDuplicate,
}: EventTypeCardProps) {
  return (
    <div
      className="event-type-card"
      style={{
        borderLeftColor: color,
        borderLeftWidth: 4,
        borderLeftStyle: "solid",
      }}
    >
      <div className="event-type-card__header">
        <h3 className="event-type-card__title">{title}</h3>
        <button
          className={`event-type-card__toggle ${isActive ? "event-type-card__toggle--active" : ""}`}
          onClick={onToggle}
        >
          {isActive ? "Active" : "Inactive"}
        </button>
      </div>
      <p className="event-type-card__slug">/{slug}</p>
      <p className="event-type-card__duration">{duration} min</p>
      {description && <p className="event-type-card__desc">{description}</p>}
      <div className="event-type-card__actions">
        <button className="btn btn-sm" onClick={onEdit}>
          Edit
        </button>
        <button className="btn btn-sm btn-outline" onClick={onDuplicate}>
          Duplicate
        </button>
      </div>
    </div>
  );
});

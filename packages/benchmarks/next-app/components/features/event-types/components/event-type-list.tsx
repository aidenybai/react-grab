"use client";

import { useState, useMemo } from "react";

interface EventType {
  id: string;
  title: string;
  slug: string;
  duration: number;
  isActive: boolean;
  color: string;
}

interface EventTypeListProps {
  eventTypes: EventType[];
  onSelect?: (id: string) => void;
  onReorder?: (ids: string[]) => void;
}

export function EventTypeList({
  eventTypes,
  onSelect,
  onReorder,
}: EventTypeListProps) {
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  const filtered = useMemo(() => {
    if (filter === "active") return eventTypes.filter((e) => e.isActive);
    if (filter === "inactive") return eventTypes.filter((e) => !e.isActive);
    return eventTypes;
  }, [eventTypes, filter]);

  return (
    <div className="event-type-list">
      <div className="event-type-list__filters">
        <button
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          All
        </button>
        <button
          className={filter === "active" ? "active" : ""}
          onClick={() => setFilter("active")}
        >
          Active
        </button>
        <button
          className={filter === "inactive" ? "active" : ""}
          onClick={() => setFilter("inactive")}
        >
          Inactive
        </button>
      </div>
      <div className="event-type-list__items">
        {filtered.map((et) => (
          <div
            key={et.id}
            className="event-type-list__item"
            onClick={() => onSelect?.(et.id)}
            style={{
              borderLeftColor: et.color,
              borderLeftWidth: 3,
              borderLeftStyle: "solid",
            }}
          >
            <span className="event-type-list__item-title">{et.title}</span>
            <span className="event-type-list__item-duration">
              {et.duration}m
            </span>
            <span
              className={`event-type-list__item-status ${et.isActive ? "active" : "inactive"}`}
            >
              {et.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

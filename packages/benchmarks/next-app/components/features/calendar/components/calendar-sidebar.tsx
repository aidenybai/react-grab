"use client";

import { useState } from "react";

interface CalendarSidebarProps {
  calendars: Array<{
    id: string;
    name: string;
    color: string;
    enabled: boolean;
  }>;
  onToggleCalendar?: (calendarId: string) => void;
  onCreateCalendar?: () => void;
}

export function CalendarSidebar({
  calendars,
  onToggleCalendar,
  onCreateCalendar,
}: CalendarSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`calendar-sidebar ${collapsed ? "calendar-sidebar--collapsed" : ""}`}
    >
      <div className="calendar-sidebar__header">
        <h3>Calendars</h3>
        <button onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? "Expand" : "Collapse"}
        </button>
      </div>
      {!collapsed && (
        <ul className="calendar-sidebar__list">
          {calendars.map((cal) => (
            <li key={cal.id} className="calendar-sidebar__item">
              <label>
                <input
                  type="checkbox"
                  checked={cal.enabled}
                  onChange={() => onToggleCalendar?.(cal.id)}
                />
                <span style={{ color: cal.color }}>{cal.name}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <button className="btn btn-primary" onClick={onCreateCalendar}>
        New Calendar
      </button>
    </aside>
  );
}

"use client";

import { memo } from "react";

interface WorkflowCardProps {
  name: string;
  description?: string;
  trigger: string;
  stepsCount: number;
  isActive: boolean;
  lastRun?: string;
  onToggle?: () => void;
  onClick?: () => void;
}

export const WorkflowCard = memo(function WorkflowCard({
  name,
  description,
  trigger,
  stepsCount,
  isActive,
  lastRun,
  onToggle,
  onClick,
}: WorkflowCardProps) {
  return (
    <div className="workflow-card" onClick={onClick} role="button" tabIndex={0}>
      <div className="workflow-card__header">
        <h3 className="workflow-card__name">{name}</h3>
        <button
          className={`workflow-card__toggle ${isActive ? "workflow-card__toggle--active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.();
          }}
        >
          {isActive ? "Active" : "Inactive"}
        </button>
      </div>
      {description && <p className="workflow-card__desc">{description}</p>}
      <div className="workflow-card__meta">
        <span>Trigger: {trigger}</span>
        <span>{stepsCount} steps</span>
        {lastRun && <span>Last run: {lastRun}</span>}
      </div>
    </div>
  );
});

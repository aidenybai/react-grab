"use client";

import { forwardRef } from "react";

interface WorkflowStepProps {
  stepNumber: number;
  type: string;
  title: string;
  description?: string;
  isActive?: boolean;
  isError?: boolean;
  onClick?: () => void;
}

export const WorkflowStep = forwardRef<HTMLDivElement, WorkflowStepProps>(
  function WorkflowStep(
    { stepNumber, type, title, description, isActive, isError, onClick },
    ref,
  ) {
    const className = [
      "workflow-step",
      isActive && "workflow-step--active",
      isError && "workflow-step--error",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div
        ref={ref}
        className={className}
        onClick={onClick}
        role="button"
        tabIndex={0}
      >
        <div className="workflow-step__badge">{stepNumber}</div>
        <div className="workflow-step__content">
          <span className="workflow-step__type">{type}</span>
          <h4 className="workflow-step__title">{title}</h4>
          {description && <p className="workflow-step__desc">{description}</p>}
        </div>
      </div>
    );
  },
);

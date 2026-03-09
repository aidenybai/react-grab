export interface Workflow {
  id: string;
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  teamId?: string;
}

export interface WorkflowStep {
  id: string;
  type: WorkflowStepType;
  config: Record<string, unknown>;
  order: number;
  conditions?: WorkflowCondition[];
}

export type WorkflowStepType =
  | "email"
  | "sms"
  | "webhook"
  | "delay"
  | "condition";

export type WorkflowTrigger =
  | "booking_created"
  | "booking_cancelled"
  | "booking_rescheduled"
  | "form_submitted"
  | "new_attendee"
  | "before_event"
  | "after_event";

export interface WorkflowCondition {
  id: string;
  field: string;
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "starts_with"
    | "ends_with"
    | "gt"
    | "lt";
  value: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: "success" | "failure" | "running" | "skipped";
  startedAt: Date;
  completedAt?: Date;
  duration: number;
  triggeredBy: string;
  error?: string;
  stepResults: WorkflowStepResult[];
}

export interface WorkflowStepResult {
  stepId: string;
  status: "success" | "failure" | "skipped";
  output?: unknown;
  error?: string;
}

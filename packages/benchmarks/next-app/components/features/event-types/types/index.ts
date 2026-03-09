export interface EventType {
  id: string;
  title: string;
  slug: string;
  description?: string;
  duration: number;
  color: string;
  isActive: boolean;
  userId: string;
  teamId?: string;
  locations: EventTypeLocation[];
  customFields: CustomField[];
  recurring?: RecurringConfig;
  payment?: PaymentConfig;
  requiresConfirmation: boolean;
  minimumNotice: number;
  bufferTime: { before: number; after: number };
  createdAt: Date;
  updatedAt: Date;
}

export interface EventTypeLocation {
  type: string;
  value?: string;
  public?: boolean;
}

export interface CustomField {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox" | "phone" | "email";
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface RecurringConfig {
  enabled: boolean;
  frequency: "daily" | "weekly" | "monthly";
  interval: number;
  count: number;
}

export interface PaymentConfig {
  enabled: boolean;
  amount: number;
  currency: string;
  collectOnBooking: boolean;
}

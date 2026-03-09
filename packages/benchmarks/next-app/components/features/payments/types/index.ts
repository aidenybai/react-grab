export interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  description: string;
  customerName?: string;
  customerEmail?: string;
  paymentMethodId: string;
  createdAt: Date;
  refundedAt?: Date;
  refundAmount?: number;
}

export type PaymentStatus =
  | "paid"
  | "pending"
  | "failed"
  | "refunded"
  | "partially_refunded";

export interface PaymentMethod {
  id: string;
  type: "card" | "bank_account" | "paypal";
  brand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

export interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  amount: number;
  currency: string;
  status: "paid" | "unpaid" | "overdue" | "void";
  lineItems: InvoiceLineItem[];
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Subscription {
  id: string;
  plan: SubscriptionPlan;
  status: "active" | "past_due" | "cancelled" | "trialing";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: "monthly" | "yearly";
  features: string[];
}

export interface IntegrationCategory {
  id: string;
  name: string;
  description: string;
}

export const INTEGRATION_CATEGORIES: IntegrationCategory[] = [
  {
    id: "calendar",
    name: "Calendar",
    description: "Calendar sync integrations",
  },
  {
    id: "video",
    name: "Video Conferencing",
    description: "Video meeting integrations",
  },
  {
    id: "payment",
    name: "Payment",
    description: "Payment processing integrations",
  },
  { id: "crm", name: "CRM", description: "Customer relationship management" },
  {
    id: "messaging",
    name: "Messaging",
    description: "Messaging and chat integrations",
  },
  { id: "analytics", name: "Analytics", description: "Analytics and tracking" },
];

export function getIntegrationCategory(
  categoryId: string,
): IntegrationCategory | undefined {
  return INTEGRATION_CATEGORIES.find((c) => c.id === categoryId);
}

export function formatIntegrationStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

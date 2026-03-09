export type IntegrationProvider =
  | "google-calendar"
  | "outlook"
  | "zoom"
  | "slack"
  | "stripe"
  | "zapier"
  | "hubspot"
  | "salesforce";

export type IntegrationStatus =
  | "connected"
  | "disconnected"
  | "error"
  | "pending";

export interface Integration {
  id: string;
  provider: IntegrationProvider;
  name: string;
  description: string;
  status: IntegrationStatus;
  icon: string;
  category: IntegrationCategory;
  connectedAt?: string;
  lastSyncAt?: string;
  config?: Record<string, unknown>;
  error?: string;
}

export type IntegrationCategory =
  | "calendar"
  | "video"
  | "communication"
  | "payment"
  | "automation"
  | "crm";

export interface IntegrationConnection {
  provider: IntegrationProvider;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  scopes: string[];
  accountId: string;
  accountEmail: string;
}

export interface IntegrationWebhook {
  id: string;
  integrationId: string;
  event: string;
  url: string;
  active: boolean;
  secret: string;
  createdAt: string;
}

export interface ConnectIntegrationPayload {
  provider: IntegrationProvider;
  authCode: string;
  redirectUri: string;
}

export interface IntegrationSyncStatus {
  lastSync: string;
  nextSync: string;
  itemsSynced: number;
  errors: number;
  status: "idle" | "syncing" | "failed";
}

export interface Integration {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: IntegrationCategory;
  iconUrl?: string;
  isInstalled: boolean;
  isEnabled: boolean;
  config?: Record<string, string>;
  credentials?: IntegrationCredentials;
  webhooks?: IntegrationWebhook[];
}

export type IntegrationCategory =
  | "calendar"
  | "video"
  | "payment"
  | "crm"
  | "messaging"
  | "analytics";

export interface IntegrationCredentials {
  type: "oauth" | "api_key" | "webhook";
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  expiresAt?: Date;
}

export interface IntegrationWebhook {
  id: string;
  url: string;
  secret?: string;
  events: string[];
  isActive: boolean;
  createdAt: Date;
}

export interface OAuthProvider {
  id: string;
  name: string;
  clientId: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
}

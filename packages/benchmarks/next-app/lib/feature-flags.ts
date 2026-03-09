import { FEATURE_FLAGS } from "@/lib/constants";

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

interface FeatureFlagConfig {
  enabled: boolean;
  description: string;
  rolloutPercentage?: number;
}

const featureRegistry: Record<string, FeatureFlagConfig> = {
  ENABLE_DARK_MODE: {
    enabled: true,
    description: "Dark mode toggle in settings",
  },
  ENABLE_NOTIFICATIONS: {
    enabled: true,
    description: "In-app notification system",
  },
  ENABLE_ANALYTICS: { enabled: true, description: "Analytics dashboard" },
  ENABLE_EXPORT: {
    enabled: false,
    description: "Data export to CSV/PDF",
    rolloutPercentage: 25,
  },
  ENABLE_BETA_FEATURES: {
    enabled: false,
    description: "Experimental features for testing",
  },
  ENABLE_AI_ASSISTANT: {
    enabled: false,
    description: "AI-powered assistant sidebar",
    rolloutPercentage: 10,
  },
  ENABLE_COLLABORATIVE_EDITING: {
    enabled: false,
    description: "Real-time collaborative document editing",
  },
  ENABLE_WEBHOOKS: {
    enabled: false,
    description: "Custom webhook configuration",
    rolloutPercentage: 50,
  },
};

export function isFeatureEnabled(flag: string): boolean {
  const staticFlag = FEATURE_FLAGS[flag as FeatureFlag];
  if (staticFlag !== undefined) return staticFlag;

  const config = featureRegistry[flag];
  return config?.enabled ?? false;
}

export function getFeatureConfig(flag: string): FeatureFlagConfig | undefined {
  return featureRegistry[flag];
}

export function getAllFeatureFlags(): Record<string, FeatureFlagConfig> {
  return { ...featureRegistry };
}

export function isInRollout(flag: string, userId: string): boolean {
  const config = featureRegistry[flag];
  if (!config?.rolloutPercentage) return config?.enabled ?? false;

  let hash = 0;
  const input = `${flag}:${userId}`;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  const percentage = Math.abs(hash) % 100;
  return percentage < config.rolloutPercentage;
}

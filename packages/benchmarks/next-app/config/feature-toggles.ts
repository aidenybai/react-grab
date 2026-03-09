export interface FeatureToggle {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  environments: ("development" | "staging" | "production")[];
  rolloutPercentage: number;
}

export const featureToggles: FeatureToggle[] = [
  {
    id: "new-booking-flow",
    name: "New Booking Flow",
    description: "Redesigned multi-step booking experience",
    enabled: true,
    environments: ["development", "staging"],
    rolloutPercentage: 100,
  },
  {
    id: "ai-suggestions",
    name: "AI Suggestions",
    description: "AI-powered scheduling suggestions",
    enabled: false,
    environments: ["development"],
    rolloutPercentage: 0,
  },
  {
    id: "team-analytics",
    name: "Team Analytics",
    description: "Per-team analytics breakdown",
    enabled: true,
    environments: ["development", "staging", "production"],
    rolloutPercentage: 100,
  },
  {
    id: "webhook-v2",
    name: "Webhooks V2",
    description: "Enhanced webhook system with retry and filtering",
    enabled: true,
    environments: ["development", "staging"],
    rolloutPercentage: 50,
  },
  {
    id: "collaborative-notes",
    name: "Collaborative Notes",
    description: "Real-time collaborative note-taking on bookings",
    enabled: false,
    environments: ["development"],
    rolloutPercentage: 10,
  },
];

export function isToggleActive(toggleId: string): boolean {
  const env = process.env.NODE_ENV as "development" | "staging" | "production";
  const toggle = featureToggles.find((t) => t.id === toggleId);
  if (!toggle) return false;
  return toggle.enabled && toggle.environments.includes(env);
}

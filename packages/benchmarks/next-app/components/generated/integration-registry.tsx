"use client";
import React from "react";

interface IntegrationMeta {
  slug: string;
  name: string;
  category: string;
  icon: string;
  enabled: boolean;
}

const INTEGRATION_REGISTRY: IntegrationMeta[] = [
  {
    slug: "slack",
    name: "Slack",
    category: "communication",
    icon: "S",
    enabled: true,
  },
  {
    slug: "github",
    name: "GitHub",
    category: "developer",
    icon: "G",
    enabled: true,
  },
  {
    slug: "linear",
    name: "Linear",
    category: "project-management",
    icon: "L",
    enabled: true,
  },
  {
    slug: "figma",
    name: "Figma",
    category: "design",
    icon: "F",
    enabled: true,
  },
  {
    slug: "notion",
    name: "Notion",
    category: "documentation",
    icon: "N",
    enabled: true,
  },
  {
    slug: "jira",
    name: "Jira",
    category: "project-management",
    icon: "J",
    enabled: false,
  },
  {
    slug: "discord",
    name: "Discord",
    category: "communication",
    icon: "D",
    enabled: true,
  },
  {
    slug: "vercel",
    name: "Vercel",
    category: "developer",
    icon: "V",
    enabled: true,
  },
  {
    slug: "stripe",
    name: "Stripe",
    category: "payments",
    icon: "$",
    enabled: true,
  },
  {
    slug: "sentry",
    name: "Sentry",
    category: "monitoring",
    icon: "!",
    enabled: false,
  },
];

export const getIntegrationBySlug = (
  slug: string,
): IntegrationMeta | undefined =>
  INTEGRATION_REGISTRY.find((i) => i.slug === slug);

export const getEnabledIntegrations = (): IntegrationMeta[] =>
  INTEGRATION_REGISTRY.filter((i) => i.enabled);

export const getIntegrationsByCategory = (
  category: string,
): IntegrationMeta[] =>
  INTEGRATION_REGISTRY.filter((i) => i.category === category);

export const IntegrationCard = ({
  slug,
  onConnect,
  onDisconnect,
  connected = false,
}: {
  slug: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  connected?: boolean;
}) => {
  const integration = getIntegrationBySlug(slug);
  if (!integration) return null;

  return (
    <div
      data-testid="generated-integration-card"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        background: connected ? "#f0fdf4" : "#fff",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "8px",
            background: "#f3f4f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            fontWeight: 700,
          }}
        >
          {integration.icon}
        </span>
        <div>
          <p style={{ fontWeight: 600, fontSize: "14px" }}>
            {integration.name}
          </p>
          <p style={{ fontSize: "12px", color: "#6b7280" }}>
            {integration.category}
          </p>
        </div>
      </div>
      <button
        onClick={connected ? onDisconnect : onConnect}
        disabled={!integration.enabled}
        style={{
          padding: "6px 14px",
          borderRadius: "6px",
          fontSize: "13px",
          fontWeight: 500,
          border: connected ? "1px solid #d1d5db" : "none",
          background: connected ? "#fff" : "#2563eb",
          color: connected ? "#374151" : "#fff",
          cursor: integration.enabled ? "pointer" : "not-allowed",
          opacity: integration.enabled ? 1 : 0.5,
        }}
      >
        {connected ? "Disconnect" : "Connect"}
      </button>
    </div>
  );
};

export const CATEGORIES = [
  ...new Set(INTEGRATION_REGISTRY.map((i) => i.category)),
];

export default INTEGRATION_REGISTRY;

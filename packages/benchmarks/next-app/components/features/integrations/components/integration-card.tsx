"use client";

import { memo } from "react";

interface IntegrationCardProps {
  name: string;
  description: string;
  iconUrl?: string;
  category: string;
  isInstalled: boolean;
  isEnabled?: boolean;
  onInstall?: () => void;
  onConfigure?: () => void;
}

export const IntegrationCard = memo(function IntegrationCard({
  name,
  description,
  iconUrl,
  category,
  isInstalled,
  isEnabled,
  onInstall,
  onConfigure,
}: IntegrationCardProps) {
  return (
    <div className="integration-card">
      <div className="integration-card__icon">
        {iconUrl ? (
          <img src={iconUrl} alt={name} width={40} height={40} />
        ) : (
          <span className="integration-card__icon-fallback">{name[0]}</span>
        )}
      </div>
      <div className="integration-card__body">
        <h3 className="integration-card__name">{name}</h3>
        <p className="integration-card__desc">{description}</p>
        <span className="integration-card__category">{category}</span>
      </div>
      <div className="integration-card__actions">
        {isInstalled ? (
          <button className="btn btn-outline btn-sm" onClick={onConfigure}>
            Configure
          </button>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={onInstall}>
            Install
          </button>
        )}
      </div>
    </div>
  );
});

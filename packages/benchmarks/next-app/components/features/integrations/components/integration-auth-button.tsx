"use client";

import { useState, useCallback } from "react";

interface IntegrationAuthButtonProps {
  integrationName: string;
  isConnected: boolean;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
}

export function IntegrationAuthButton({
  integrationName,
  isConnected,
  onConnect,
  onDisconnect,
}: IntegrationAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isConnected) {
        await onDisconnect();
      } else {
        await onConnect();
      }
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, onConnect, onDisconnect]);

  return (
    <button
      className={`integration-auth-button ${isConnected ? "integration-auth-button--connected" : ""}`}
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading
        ? "Processing..."
        : isConnected
          ? `Disconnect ${integrationName}`
          : `Connect ${integrationName}`}
    </button>
  );
}

"use client";

import { useEffect, useState } from "react";

interface OAuthCallbackHandlerProps {
  provider: string;
  onSuccess: (code: string) => void;
  onError: (error: string) => void;
}

export function OAuthCallbackHandler({
  provider,
  onSuccess,
  onError,
}: OAuthCallbackHandlerProps) {
  const [status, setStatus] = useState<"processing" | "success" | "error">(
    "processing",
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (error) {
      setStatus("error");
      onError(error);
    } else if (code) {
      setStatus("success");
      onSuccess(code);
    } else {
      setStatus("error");
      onError("No authorization code received");
    }
  }, [onSuccess, onError]);

  return (
    <div className="oauth-callback-handler">
      {status === "processing" && <p>Connecting to {provider}...</p>}
      {status === "success" && <p>Successfully connected to {provider}!</p>}
      {status === "error" && <p>Failed to connect to {provider}.</p>}
    </div>
  );
}

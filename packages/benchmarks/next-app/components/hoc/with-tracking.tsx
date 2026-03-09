"use client";
import React, { ComponentType } from "react";

export function withTracking<P extends object>(
  WrappedComponent: ComponentType<P>,
  trackingId?: string,
) {
  const WithTracking = (props: P) => {
    return (
      <div
        data-tracking={trackingId || "unknown"}
        style={{ display: "contents" }}
      >
        <WrappedComponent {...props} />
      </div>
    );
  };
  WithTracking.displayName = `withTracking(${WrappedComponent.displayName || WrappedComponent.name || "Component"})`;
  return WithTracking;
}

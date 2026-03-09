"use client";
import React, { ComponentType } from "react";

export function withPermissions<P extends object>(
  WrappedComponent: ComponentType<P>,
  _requiredPermission?: string,
) {
  const WithPermissions = (props: P) => {
    return <WrappedComponent {...props} />;
  };
  WithPermissions.displayName = `withPermissions(${WrappedComponent.displayName || WrappedComponent.name || "Component"})`;
  return WithPermissions;
}

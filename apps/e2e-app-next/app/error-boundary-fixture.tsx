"use client";

import { Component, useState } from "react";

class RecoverableErrorBoundary extends Component<
  RecoverableErrorBoundaryProps,
  RecoverableErrorBoundaryState
> {
  state: RecoverableErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError = (): RecoverableErrorBoundaryState => ({ hasError: true });

  render = () => {
    if (this.state.hasError) {
      return (
        <div data-testid="error-fallback" role="alert">
          Recoverable fixture error
          <button data-testid="error-reset" onClick={this.props.onReset} type="button">
            Reset error boundary
          </button>
        </div>
      );
    }

    return this.props.children;
  };
}

const ErrorTarget = (props: ErrorTargetProps) => {
  if (props.shouldThrow) {
    throw new Error("Intentional recoverable fixture error");
  }

  return <p>Error boundary ready</p>;
};

export const ErrorBoundaryFixture = () => {
  const [boundaryVersion, setBoundaryVersion] = useState(0);
  const [shouldThrow, setShouldThrow] = useState(false);
  const resetBoundary = () => {
    setShouldThrow(false);
    setBoundaryVersion((currentVersion) => currentVersion + 1);
  };

  return (
    <section>
      <button data-testid="error-trigger" onClick={() => setShouldThrow(true)} type="button">
        Trigger recoverable error
      </button>
      <RecoverableErrorBoundary key={boundaryVersion} onReset={resetBoundary}>
        <ErrorTarget shouldThrow={shouldThrow} />
      </RecoverableErrorBoundary>
    </section>
  );
};

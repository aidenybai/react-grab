import { Component, useState } from "react";

export class FixtureErrorBoundary extends Component<
  FixtureErrorBoundaryProps,
  FixtureErrorBoundaryState
> {
  state: FixtureErrorBoundaryState = { didError: false };

  static getDerivedStateFromError = (): FixtureErrorBoundaryState => ({ didError: true });

  reset = () => {
    this.props.onReset();
    this.setState({ didError: false });
  };

  render = () => {
    if (this.state.didError) {
      return (
        <div data-testid="error-fallback" role="alert">
          <p>The fixture recovered from a render error.</p>
          <button data-testid="error-reset" onClick={this.reset} type="button">
            Reset error
          </button>
        </div>
      );
    }

    return this.props.children;
  };
}

const ErrorTriggerContent = (props: ErrorTriggerContentProps) => {
  if (props.shouldThrow) {
    throw new Error("Fixture render error");
  }

  return (
    <button data-testid="error-trigger" onClick={props.triggerError} type="button">
      Trigger error
    </button>
  );
};

export const RecoverableErrorSection = () => {
  const [shouldThrow, setShouldThrow] = useState(false);

  return (
    <FixtureErrorBoundary onReset={() => setShouldThrow(false)}>
      <ErrorTriggerContent shouldThrow={shouldThrow} triggerError={() => setShouldThrow(true)} />
    </FixtureErrorBoundary>
  );
};

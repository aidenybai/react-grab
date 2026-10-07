import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";
import type { formatElementInfo, init } from "react-grab";

declare global {
  interface Window {
    formatElementInfo: typeof formatElementInfo;
    initReactGrab: typeof init;
  }

  interface PassedChildProps {
    children: ReactNode;
  }

  interface CloneableTargetProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    "data-testid": string;
  }

  interface CloningWrapperProps {
    children: ReactElement<CloneableTargetProps>;
  }

  interface FixtureErrorBoundaryProps {
    children: ReactNode;
    onReset: () => void;
  }

  interface FixtureErrorBoundaryState {
    didError: boolean;
  }

  interface ErrorTriggerContentProps {
    shouldThrow: boolean;
    triggerError: () => void;
  }

  interface SuspenseTargetModule {
    default: () => ReactElement;
  }

  interface ReorderItem {
    id: string;
    label: string;
  }
}

export {};

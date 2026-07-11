interface CloneableTargetProps {
  children: import("react").ReactNode;
  "data-cloned"?: string;
  "data-testid"?: string;
  onClick?: import("react").MouseEventHandler<HTMLButtonElement>;
}

interface ErrorTargetProps {
  shouldThrow: boolean;
}

interface PassedChildProps {
  children: import("react").ReactNode;
}

interface ProductionProviderProps {
  children: import("react").ReactNode;
}

interface RecoverableErrorBoundaryProps {
  children: import("react").ReactNode;
  onReset: () => void;
}

interface RecoverableErrorBoundaryState {
  hasError: boolean;
}

interface ReorderItem {
  id: string;
  label: string;
}

interface RootLayoutProps {
  children: import("react").ReactNode;
}

interface SuspenseRevealedTargetProps {
  revealPromise: Promise<string>;
}

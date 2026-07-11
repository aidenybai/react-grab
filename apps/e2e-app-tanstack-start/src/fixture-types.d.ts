interface ClientErrorBoundaryProps {
  children: import("react").ReactNode;
  onReset: () => void;
}

interface ClientErrorBoundaryState {
  error: Error | null;
}

interface ClonedTargetProps {
  "data-cloned"?: string;
  "data-testid"?: string;
  onClick?: import("react").MouseEventHandler<HTMLButtonElement>;
}

interface CloningWrapperProps {
  child: import("react").ReactElement<ClonedTargetProps>;
}

interface PassedChildWrapperProps {
  children: import("react").ReactNode;
}

interface RecoverableErrorTargetProps {
  shouldThrow: boolean;
}

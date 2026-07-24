export interface HostPoint {
  x: number;
  y: number;
}

export interface HostBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HostTargetDescription {
  name: string;
  role: string | null;
  label: string | null;
  testId: string | null;
}

export interface ReactTargetMetadata {
  componentName: string | null;
  filePath: string | null;
  lineNumber: number | null;
  columnNumber: number | null;
  ownerStack: string[];
}

export interface HostTargetCapabilities {
  resolve: () => Promise<HostTarget | null>;
  measure: () => Promise<HostBounds | null>;
  describe: () => Promise<HostTargetDescription>;
  getParent?: () => Promise<HostTarget | null>;
  getChildren?: () => Promise<HostTarget[]>;
  getReactMetadata?: () => Promise<ReactTargetMetadata | null>;
}

export interface HostTarget {
  readonly id: string;
  readonly platform: string;
  readonly capabilities: HostTargetCapabilities;
}

export interface HostTargetAdapter {
  readonly platform: string;
  getTargetAtPoint: (point: HostPoint) => Promise<HostTarget | null>;
}

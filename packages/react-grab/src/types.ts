export interface Options {
  enabled?: boolean;
  keyHoldDuration?: number;
  onActivate?: () => void;
}

export interface OverlayBounds {
  borderRadius: string;
  height: number;
  transform: string;
  width: number;
  x: number;
  y: number;
}

export interface ReactGrabRendererProps {
  selectionVisible?: boolean;
  selectionBounds?: OverlayBounds;
  dragVisible?: boolean;
  dragBounds?: OverlayBounds;
  grabbedBoxes?: Array<{ id: string; bounds: OverlayBounds }>;
  successLabels?: Array<{ id: string; text: string; x: number; y: number }>;
  labelVariant?: "hover" | "processing" | "success";
  labelText?: string;
  labelX?: number;
  labelY?: number;
  labelVisible?: boolean;
  labelZIndex?: number;
  progressVisible?: boolean;
  progress?: number;
  mouseX?: number;
  mouseY?: number;
  crosshairVisible?: boolean;
}

export interface GrabbedBox {
  id: string;
  bounds: OverlayBounds;
}

export interface SourceTrace {
  functionName?: string;
  fileName?: string;
  lineNumber?: number;
  columnNumber?: number;
}

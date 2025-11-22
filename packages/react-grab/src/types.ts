export interface Options {
  enabled?: boolean;
  keyHoldDuration?: number;
  allowActivationInsideInput?: boolean;
  onActivate?: () => void;
  onDeactivate?: () => void;
  playCopySound?: boolean;
}

export interface ReactGrabAPI {
  activate: () => void;
  deactivate: () => void;
  toggle: () => void;
  isActive: () => boolean;
  dispose: () => void;
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
  grabbedBoxes?: Array<{ id: string; bounds: OverlayBounds; createdAt: number }>;
  successLabels?: Array<{ id: string; text: string }>;
  labelVariant?: "hover" | "processing" | "success";
  labelText?: string;
  labelX?: number;
  labelY?: number;
  labelVisible?: boolean;
  labelZIndex?: number;
  labelShowHint?: boolean;
  progressVisible?: boolean;
  progress?: number;
  mouseX?: number;
  mouseY?: number;
  crosshairVisible?: boolean;
  inputVisible?: boolean;
  inputX?: number;
  inputY?: number;
  inputValue?: string;
  onInputChange?: (value: string) => void;
  onInputSubmit?: () => void;
  onInputCancel?: () => void;
}

export interface GrabbedBox {
  id: string;
  bounds: OverlayBounds;
  createdAt: number;
  element: Element;
}

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface DragRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Position {
  left: number;
  top: number;
}

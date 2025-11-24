export interface Theme {
  enabled?: boolean;
  hue?: number;
  selectionBox?: {
    enabled?: boolean;
    color?: string;
    borderRadius?: string;
  };
  dragBox?: {
    enabled?: boolean;
    color?: string;
  };
  grabbedBoxes?: {
    enabled?: boolean;
    color?: string;
  };
  elementLabel?: {
    enabled?: boolean;
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    padding?: string;
    cursorOffset?: number;
  };
  successLabels?: {
    enabled?: boolean;
  };
  crosshair?: {
    enabled?: boolean;
    color?: string;
  };
  inputOverlay?: {
    enabled?: boolean;
  };
}

export interface ReactGrabState {
  isActive: boolean;
  isDragging: boolean;
  isCopying: boolean;
  targetElement: Element | null;
  dragBounds: DragRect | null;
}

export type RenderType = 'selectionBox' | 'dragBox' | 'grabbedBox' | 'elementLabel' | 'successLabel' | 'crosshair' | 'inputOverlay';

export interface RenderData {
  ref: HTMLElement | undefined;
  props: Record<string, unknown>;
}

export interface Options {
  enabled?: boolean;
  keyHoldDuration?: number;
  allowActivationInsideInput?: boolean;
  theme?: Theme;
  onActivate?: () => void;
  onDeactivate?: () => void;
  onElementHover?: (element: Element) => void;
  onElementSelect?: (element: Element) => void;
  onDragStart?: (startX: number, startY: number) => void;
  onDragEnd?: (elements: Element[], bounds: DragRect) => void;
  onBeforeCopy?: (elements: Element[]) => void | Promise<void>;
  onAfterCopy?: (elements: Element[], success: boolean) => void;
  onCopySuccess?: (elements: Element[], content: string) => void;
  onCopyError?: (error: Error) => void;
  onStateChange?: (state: ReactGrabState) => void;
  onRender?: (type: RenderType, data: RenderData) => void;
}

export interface ReactGrabAPI {
  activate: () => void;
  deactivate: () => void;
  toggle: () => void;
  isActive: () => boolean;
  dispose: () => void;
  copyElement: (elements: Element | Element[]) => Promise<boolean>;
  getState: () => ReactGrabState;
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
  labelContent?: unknown;
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
  theme?: Required<Theme>;
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

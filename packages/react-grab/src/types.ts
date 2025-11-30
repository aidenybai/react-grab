export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export interface Theme {
  /**
   * Globally toggle the entire overlay
   * @default true
   */
  enabled?: boolean;
  /**
   * Base hue (0-360) used to generate colors throughout the interface using HSL color space
   * @default 0
   */
  hue?: number;
  /**
   * The highlight box that appears when hovering over an element before selecting it
   * @default true
   */
  selectionBox?: {
    /**
     * Whether to show the selection highlight
     * @default true
     */
    enabled?: boolean;
    /**
     * The border/outline color of the selection box.
     * When undefined, falls back to grab-purple (rgb(210, 57, 192)) with opacity modifiers (50% border, 8% fill).
     * When set, this color is used as the base for both the border and fill with the same opacity modifiers.
     * @default undefined
     */
    color?: string;
    /**
     * Rounded corners of the selection box (e.g., "4px")
     * @default 0px
     */
    borderRadius?: string;
  };
  /**
   * The rectangular selection area that appears when clicking and dragging to select multiple elements
   * @default true
   */
  dragBox?: {
    /**
     * Whether to show the drag selection box
     * @default true
     */
    enabled?: boolean;
    /**
     * The fill color and border of the drag rectangle.
     * When undefined, falls back to grab-purple (rgb(210, 57, 192)) with opacity modifiers (40% border, 5% fill).
     * When set, this color is used as the base for both the border and fill with the same opacity modifiers.
     * @default undefined
     */
    color?: string;
  };
  /**
   * Brief flash/highlight boxes that appear on elements immediately after they're successfully grabbed/copied
   * @default true
   */
  grabbedBoxes?: {
    /**
     * Whether to show these success flash effects
     * @default true
     */
    enabled?: boolean;
    /**
     * The color of the flash boxes.
     * When undefined, falls back to grab-purple (rgb(210, 57, 192)) with opacity modifiers (100% border, 8% fill).
     * When set, this color is used as the base for both the border and fill with the same opacity modifiers.
     * @default undefined
     */
    color?: string;
  };
  /**
   * The floating label that follows the cursor showing information about the currently hovered element
   * @default true
   */
  elementLabel?: {
    /**
     * Whether to show the label
     * @default true
     */
    enabled?: boolean;
    /**
     * Background color of the label box
     * @default #fde7f7 (grab-pink-light)
     */
    backgroundColor?: string;
    /**
     * Color of the text inside the label
     * @default #b21c8e (grab-pink)
     */
    textColor?: string;
    /**
     * Border color around the label
     * @default #f7c5ec (grab-pink-border)
     */
    borderColor?: string;
    /**
     * Internal spacing of the label (e.g., "4px 8px")
     * @default "2px 6px"
     */
    padding?: string;
    /**
     * Distance in pixels the label appears from the cursor
     * @default 14
     */
    cursorOffset?: number;
  };
  /**
   * Text labels that appear after successful operations (like "Copied!" messages)
   * @default true
   */
  successLabels?: {
    /**
     * Whether to show success feedback labels
     * @default true
     */
    enabled?: boolean;
  };
  /**
   * The crosshair cursor overlay that helps with precise element targeting
   * @default true
   */
  crosshair?: {
    /**
     * Whether to show the crosshair
     * @default true
     */
    enabled?: boolean;
    /**
     * Color of the crosshair lines
     * @default rgba(210, 57, 192) (grab-purple)
     */
    color?: string;
  };
  /**
   * An input field overlay that can appear for text entry during selection
   * @default true
   */
  inputOverlay?: {
    /**
     * Whether to show the input overlay when needed
     * @default true
     */
    enabled?: boolean;
  };
}

export interface ReactGrabState {
  isActive: boolean;
  isDragging: boolean;
  isCopying: boolean;
  isInputMode: boolean;
  targetElement: Element | null;
  dragBounds: DragRect | null;
}

export type SuccessLabelType = "copy" | "input-submit";

export type ElementLabelVariant = "hover" | "processing" | "success";

export interface InputModeContext {
  x: number;
  y: number;
  targetElement: Element | null;
}

export interface SuccessLabelContext {
  x: number;
  y: number;
}

export interface CrosshairContext {
  x: number;
  y: number;
}

export interface ElementLabelContext {
  x: number;
  y: number;
  content: string;
}

export type RenderType =
  | "selectionBox"
  | "dragBox"
  | "grabbedBox"
  | "elementLabel"
  | "successLabel"
  | "crosshair"
  | "inputOverlay";

export interface RenderData {
  ref: HTMLElement | undefined;
  props: Record<string, unknown>;
}

export interface ActivationKey {
  key?: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}

export interface AgentContext {
  content: string;
  prompt: string;
}

export interface AgentSession {
  id: string;
  context: AgentContext;
  lastStatus: string;
  isStreaming: boolean;
  createdAt: number;
  position: { x: number; y: number };
}

export interface AgentProvider {
  send: (context: AgentContext, signal: AbortSignal) => AsyncIterable<string>;
  resume?: (sessionId: string, signal: AbortSignal) => AsyncIterable<string>;
  supportsResume?: boolean;
}

export interface AgentSessionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface AgentOptions {
  provider?: AgentProvider;
  storage?: AgentSessionStorage | null;
  onStart?: (session: AgentSession) => void;
  onStatus?: (status: string, session: AgentSession) => void;
  onComplete?: (session: AgentSession) => void;
  onError?: (error: Error, session: AgentSession) => void;
  onResume?: (session: AgentSession) => void;
}

export interface Options {
  enabled?: boolean;
  keyHoldDuration?: number;
  allowActivationInsideInput?: boolean;
  copyFileOnly?: boolean;
  log?: boolean;
  theme?: Theme;
  activationShortcut?: (event: KeyboardEvent) => boolean;
  activationKey?: ActivationKey;
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
  onInputModeChange?: (
    isInputMode: boolean,
    context: InputModeContext,
  ) => void;
  onSuccessLabel?: (
    text: string,
    type: SuccessLabelType,
    context: SuccessLabelContext,
  ) => void;
  onSelectionBox?: (
    visible: boolean,
    bounds: OverlayBounds | null,
    element: Element | null,
  ) => void;
  onDragBox?: (visible: boolean, bounds: OverlayBounds | null) => void;
  onGrabbedBox?: (bounds: OverlayBounds, element: Element) => void;
  onElementLabel?: (
    visible: boolean,
    variant: ElementLabelVariant,
    context: ElementLabelContext,
  ) => void;
  onCrosshair?: (visible: boolean, context: CrosshairContext) => void;
  onOpenFile?: (filePath: string, lineNumber?: number) => void;
  agent?: AgentOptions;
}

export interface ReactGrabAPI {
  activate: () => void;
  deactivate: () => void;
  toggle: () => void;
  isActive: () => boolean;
  dispose: () => void;
  copyElement: (elements: Element | Element[]) => Promise<boolean>;
  getState: () => ReactGrabState;
  updateTheme: (theme: DeepPartial<Theme>) => void;
  getTheme: () => Required<Theme>;
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
  selectionFilePath?: string;
  selectionLineNumber?: number;
  dragVisible?: boolean;
  dragBounds?: OverlayBounds;
  grabbedBoxes?: Array<{
    id: string;
    bounds: OverlayBounds;
    createdAt: number;
  }>;
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
  isInputExpanded?: boolean;
  inputMode?: "input" | "output";
  inputStatusText?: string;
  agentSessions?: Map<string, AgentSession>;
  onInputChange?: (value: string) => void;
  onInputSubmit?: () => void;
  onInputCancel?: () => void;
  onToggleExpand?: () => void;
  onCopyClick?: () => void;
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

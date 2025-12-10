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
   */
  selectionBox?: {
    /**
     * Whether to show the selection highlight
     * @default true
     */
    enabled?: boolean;
  };
  /**
   * The rectangular selection area that appears when clicking and dragging to select multiple elements
   */
  dragBox?: {
    /**
     * Whether to show the drag selection box
     * @default true
     */
    enabled?: boolean;
  };
  /**
   * Brief flash/highlight boxes that appear on elements immediately after they're successfully grabbed/copied
   */
  grabbedBoxes?: {
    /**
     * Whether to show these success flash effects
     * @default true
     */
    enabled?: boolean;
  };
  /**
   * The floating label that follows the cursor showing information about the currently hovered element
   */
  elementLabel?: {
    /**
     * Whether to show the label
     * @default true
     */
    enabled?: boolean;
  };
  /**
   * The crosshair cursor overlay that helps with precise element targeting
   */
  crosshair?: {
    /**
     * Whether to show the crosshair
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

export type ElementLabelVariant = "hover" | "processing" | "success";

export interface InputModeContext {
  x: number;
  y: number;
  targetElement: Element | null;
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

export interface ActivationKey {
  key?: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}

export interface AgentContext<T = unknown> {
  content: string;
  prompt: string;
  options?: T;
  sessionId?: string;
}

export interface AgentSession {
  id: string;
  context: AgentContext;
  lastStatus: string;
  isStreaming: boolean;
  createdAt: number;
  lastUpdatedAt: number;
  position: { x: number; y: number };
  selectionBounds?: OverlayBounds;
  tagName?: string;
  componentName?: string;
  error?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface AgentProvider<T = any> {
  send: (
    context: AgentContext<T>,
    signal: AbortSignal,
  ) => AsyncIterable<string>;
  resume?: (
    sessionId: string,
    signal: AbortSignal,
    storage: AgentSessionStorage,
  ) => AsyncIterable<string>;
  abort?: (sessionId: string) => Promise<void>;
  supportsResume?: boolean;
  supportsFollowUp?: boolean;
  checkConnection?: () => Promise<boolean>;
  getCompletionMessage?: () => string | undefined;
  undo?: () => Promise<void>;
}

export interface AgentSessionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface AgentCompleteResult {
  error?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface AgentOptions<T = any> {
  provider?: AgentProvider<T>;
  storage?: AgentSessionStorage | null;
  getOptions?: () => T;
  onStart?: (session: AgentSession, element: Element | undefined) => void;
  onStatus?: (status: string, session: AgentSession) => void;
  onComplete?: (
    session: AgentSession,
    element: Element | undefined,
  ) => AgentCompleteResult | void;
  onError?: (error: Error, session: AgentSession) => void;
  onResume?: (session: AgentSession) => void;
  onAbort?: (session: AgentSession, element: Element | undefined) => void;
  onUndo?: (session: AgentSession, element: Element | undefined) => void;
}

export interface Options {
  enabled?: boolean;
  keyHoldDuration?: number;
  allowActivationInsideInput?: boolean;
  maxContextLines?: number;
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
  onInputModeChange?: (isInputMode: boolean, context: InputModeContext) => void;
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

export interface UpdatableOptions {
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
  onInputModeChange?: (isInputMode: boolean, context: InputModeContext) => void;
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
  setAgent: (options: AgentOptions) => void;
  updateOptions: (options: UpdatableOptions) => void;
}

export interface OverlayBounds {
  borderRadius: string;
  height: number;
  transform: string;
  width: number;
  x: number;
  y: number;
}

export type SelectionLabelStatus = "idle" | "copying" | "copied" | "fading";

export interface SelectionLabelInstance {
  id: string;
  bounds: OverlayBounds;
  tagName: string;
  componentName?: string;
  status: SelectionLabelStatus;
  createdAt: number;
  element?: Element;
  mouseX?: number;
}

export interface ReactGrabRendererProps {
  selectionVisible?: boolean;
  selectionBounds?: OverlayBounds;
  selectionFilePath?: string;
  selectionLineNumber?: number;
  selectionTagName?: string;
  selectionComponentName?: string;
  selectionLabelVisible?: boolean;
  selectionLabelStatus?: SelectionLabelStatus;
  labelInstances?: SelectionLabelInstance[];
  dragVisible?: boolean;
  dragBounds?: OverlayBounds;
  grabbedBoxes?: Array<{
    id: string;
    bounds: OverlayBounds;
    createdAt: number;
  }>;
  labelZIndex?: number;
  mouseX?: number;
  mouseY?: number;
  crosshairVisible?: boolean;
  inputValue?: string;
  isInputExpanded?: boolean;
  replyToPrompt?: string;
  hasAgent?: boolean;
  isAgentConnected?: boolean;
  agentSessions?: Map<string, AgentSession>;
  supportsUndo?: boolean;
  supportsFollowUp?: boolean;
  onAbortSession?: (sessionId: string) => void;
  onDismissSession?: (sessionId: string) => void;
  onUndoSession?: (sessionId: string) => void;
  onReplySession?: (sessionId: string) => void;
  onAcknowledgeSessionError?: (sessionId: string) => void;
  onRetrySession?: (sessionId: string) => void;
  onInputChange?: (value: string) => void;
  onInputSubmit?: () => void;
  onInputCancel?: () => void;
  onToggleExpand?: () => void;
  isPendingDismiss?: boolean;
  onConfirmDismiss?: () => void;
  onCancelDismiss?: () => void;
  nativeSelectionCursorVisible?: boolean;
  nativeSelectionCursorX?: number;
  nativeSelectionCursorY?: number;
  nativeSelectionTagName?: string;
  nativeSelectionComponentName?: string;
  nativeSelectionBounds?: OverlayBounds;
  onNativeSelectionCopy?: () => void;
  onNativeSelectionEnter?: () => void;
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

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
  /**
   * The floating toolbar that allows toggling React Grab activation
   */
  toolbar?: {
    /**
     * Whether to show the toolbar
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
  content: string[];
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
  selectionBounds: OverlayBounds[];
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
  dismissButtonText?: string;
  checkConnection?: () => Promise<boolean>;
  getCompletionMessage?: () => string | undefined;
  undo?: () => Promise<void>;
  canUndo?: () => boolean;
  redo?: () => Promise<void>;
  canRedo?: () => boolean;
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
  onStart?: (session: AgentSession, elements: Element[]) => void;
  onStatus?: (status: string, session: AgentSession) => void;
  onComplete?: (
    session: AgentSession,
    elements: Element[],
  ) => AgentCompleteResult | void | Promise<AgentCompleteResult | void>;
  onError?: (error: Error, session: AgentSession) => void;
  onResume?: (session: AgentSession) => void;
  onAbort?: (session: AgentSession, elements: Element[]) => void;
  onUndo?: (session: AgentSession, elements: Element[]) => void;
  onDismiss?: (session: AgentSession, elements: Element[]) => void;
}

export type ActivationMode = "toggle" | "hold";

export interface Options {
  enabled?: boolean;
  activationMode?: ActivationMode;
  keyHoldDuration?: number;
  allowActivationInsideInput?: boolean;
  maxContextLines?: number;
  theme?: Theme;
  activationShortcut?: (event: KeyboardEvent) => boolean;
  activationKey?: ActivationKey;
  getContent?: (elements: Element[]) => Promise<string> | string;
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

export type UpdatableOptions = Pick<
  Options,
  | "onActivate"
  | "onDeactivate"
  | "onElementHover"
  | "onElementSelect"
  | "onDragStart"
  | "onDragEnd"
  | "onBeforeCopy"
  | "onAfterCopy"
  | "onCopySuccess"
  | "onCopyError"
  | "onStateChange"
  | "onInputModeChange"
  | "onSelectionBox"
  | "onDragBox"
  | "onGrabbedBox"
  | "onElementLabel"
  | "onCrosshair"
  | "onOpenFile"
>;

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
  selectionBoundsMultiple?: OverlayBounds[];
  selectionElementsCount?: number;
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
  isInputMode?: boolean;
  replyToPrompt?: string;
  hasAgent?: boolean;
  isAgentConnected?: boolean;
  agentSessions?: Map<string, AgentSession>;
  supportsUndo?: boolean;
  supportsFollowUp?: boolean;
  dismissButtonText?: string;
  onRequestAbortSession?: (sessionId: string) => void;
  onAbortSession?: (sessionId: string, confirmed: boolean) => void;
  onDismissSession?: (sessionId: string) => void;
  onUndoSession?: (sessionId: string) => void;
  onFollowUpSubmitSession?: (sessionId: string, prompt: string) => void;
  onAcknowledgeSessionError?: (sessionId: string) => void;
  onRetrySession?: (sessionId: string) => void;
  onInputChange?: (value: string) => void;
  onInputSubmit?: () => void;
  onInputCancel?: () => void;
  onToggleExpand?: () => void;
  isPendingDismiss?: boolean;
  onConfirmDismiss?: () => void;
  onCancelDismiss?: () => void;
  pendingAbortSessionId?: string | null;
  theme?: Required<Theme>;
  toolbarVisible?: boolean;
  isActive?: boolean;
  onToggleActive?: () => void;
  contextMenuPosition?: { x: number; y: number } | null;
  contextMenuBounds?: OverlayBounds | null;
  contextMenuTagName?: string;
  contextMenuComponentName?: string;
  contextMenuHasFilePath?: boolean;
  contextMenuHasAgent?: boolean;
  onContextMenuCopy?: () => void;
  onContextMenuOpen?: () => void;
  onContextMenuPrompt?: () => void;
  onContextMenuDismiss?: () => void;
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

export type ArrowPosition = "bottom" | "top";

export interface ArrowProps {
  position: ArrowPosition;
  leftPx: number;
  color?: string;
}

export interface TagBadgeProps {
  tagName: string;
  isClickable: boolean;
  onClick: (event: MouseEvent) => void;
  onHoverChange?: (hovered: boolean) => void;
  shrink?: boolean;
  forceShowIcon?: boolean;
}

export interface ActionPillProps {
  onClick: () => void;
  asButton?: boolean;
  dimmed?: boolean;
  shrink?: boolean;
  hasAgent?: boolean;
  isEditing?: boolean;
}

export interface BottomSectionProps {
  children: import("solid-js").JSX.Element;
}

export interface DiscardPromptProps {
  onConfirm?: () => void;
  onCancel?: () => void;
}

export interface ErrorViewProps {
  error: string;
  onAcknowledge?: () => void;
  onRetry?: () => void;
}

export interface CompletionViewProps {
  statusText: string;
  supportsUndo?: boolean;
  supportsFollowUp?: boolean;
  dismissButtonText?: string;
  previousPrompt?: string;
  onDismiss?: () => void;
  onUndo?: () => void;
  onFollowUpSubmit?: (prompt: string) => void;
  onCopyStateChange?: () => void;
}

export interface SelectionLabelProps {
  tagName?: string;
  componentName?: string;
  elementsCount?: number;
  selectionBounds?: OverlayBounds;
  mouseX?: number;
  visible?: boolean;
  isInputMode?: boolean;
  inputValue?: string;
  replyToPrompt?: string;
  previousPrompt?: string;
  hasAgent?: boolean;
  isAgentConnected?: boolean;
  status?: SelectionLabelStatus;
  statusText?: string;
  filePath?: string;
  lineNumber?: number;
  supportsUndo?: boolean;
  supportsFollowUp?: boolean;
  dismissButtonText?: string;
  onInputChange?: (value: string) => void;
  onSubmit?: () => void;
  onCancel?: () => void;
  onToggleExpand?: () => void;
  onAbort?: () => void;
  onOpen?: () => void;
  onDismiss?: () => void;
  onUndo?: () => void;
  onFollowUpSubmit?: (prompt: string) => void;
  isPendingDismiss?: boolean;
  onConfirmDismiss?: () => void;
  onCancelDismiss?: () => void;
  isPendingAbort?: boolean;
  onConfirmAbort?: () => void;
  onCancelAbort?: () => void;
  error?: string;
  onAcknowledgeError?: () => void;
  onRetry?: () => void;
}

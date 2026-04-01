export interface Position {
  x: number;
  y: number;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object
    ? T[P] extends (...args: unknown[]) => unknown
      ? T[P]
      : DeepPartial<T[P]>
    : T[P];
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
  isPromptMode: boolean;
  isSelectionBoxVisible: boolean;
  isDragBoxVisible: boolean;
  targetElement: Element | null;
  dragBounds: DragRect | null;
  /**
   * Currently visible grabbed boxes (success flash effects).
   * These are temporary visual indicators shown after elements are grabbed/copied.
   */
  grabbedBoxes: Array<{
    id: string;
    bounds: OverlayBounds;
    createdAt: number;
  }>;
  labelInstances: Array<{
    id: string;
    status: SelectionLabelStatus;
    tagName: string;
    componentName?: string;
    createdAt: number;
  }>;
  selectionFilePath: string | null;
  toolbarState: ToolbarState | null;
}

export type ElementLabelVariant = "hover" | "processing" | "success";

export interface PromptModeContext {
  x: number;
  y: number;
  targetElement: Element | null;
}

export interface ElementLabelContext {
  x: number;
  y: number;
  content: string;
  element?: Element;
  tagName?: string;
  componentName?: string;
  filePath?: string;
  lineNumber?: number;
}

export type ActivationKey = string | ((event: KeyboardEvent) => boolean);

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
  isFading?: boolean;
  createdAt: number;
  lastUpdatedAt: number;
  position: Position;
  selectionBounds: OverlayBounds[];
  tagName?: string;
  componentName?: string;
  error?: string;
}

export interface AgentProvider<T = unknown> {
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

export interface AgentOptions<T = unknown> {
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

export interface ActionContextHooks {
  transformHtmlContent: (html: string, elements: Element[]) => Promise<string>;
  onOpenFile: (filePath: string, lineNumber?: number) => boolean | void;
  transformOpenFileUrl: (
    url: string,
    filePath: string,
    lineNumber?: number,
  ) => string;
}

export interface ActionContext {
  element: Element;
  elements: Element[];
  filePath?: string;
  lineNumber?: number;
  componentName?: string;
  tagName?: string;
  enterPromptMode?: (agent?: AgentOptions) => void;
  hooks: ActionContextHooks;
  performWithFeedback: (action: () => Promise<boolean>) => Promise<void>;
  hideContextMenu: () => void;
  cleanup: () => void;
}

export interface ContextMenuActionContext extends ActionContext {
  copy?: () => void;
}

export interface ContextMenuAction {
  id: string;
  label: string;
  shortcut?: string;
  showInToolbarMenu?: boolean;
  enabled?: boolean | ((context: ActionContext) => boolean);
  onAction: (context: ContextMenuActionContext) => void | Promise<void>;
  agent?: AgentOptions;
}

export interface ActionCycleItem {
  id: string;
  label: string;
  shortcut?: string;
}

export interface ActionCycleState {
  items: ActionCycleItem[];
  activeIndex: number | null;
  isVisible: boolean;
}

export interface ArrowNavigationItem {
  tagName: string;
  componentName?: string;
}

export interface ArrowNavigationState {
  items: ArrowNavigationItem[];
  activeIndex: number;
  isVisible: boolean;
}

export interface PerformWithFeedbackOptions {
  fallbackBounds?: OverlayBounds;
  fallbackSelectionBounds?: OverlayBounds[];
  position?: Position;
}

export interface PluginHooks {
  onActivate?: () => void;
  onDeactivate?: () => void;
  onElementHover?: (element: Element) => void;
  onElementSelect?: (element: Element) => boolean | void | Promise<boolean>;
  onDragStart?: (startX: number, startY: number) => void;
  onDragEnd?: (elements: Element[], bounds: DragRect) => void;
  onBeforeCopy?: (elements: Element[]) => void | Promise<void>;
  transformCopyContent?: (
    content: string,
    elements: Element[],
  ) => string | Promise<string>;
  onAfterCopy?: (elements: Element[], success: boolean) => void;
  onCopySuccess?: (elements: Element[], content: string) => void;
  onCopyError?: (error: Error) => void;
  onStateChange?: (state: ReactGrabState) => void;
  onPromptModeChange?: (
    isPromptMode: boolean,
    context: PromptModeContext,
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
  onContextMenu?: (element: Element, position: Position) => void;
  onOpenFile?: (filePath: string, lineNumber?: number) => boolean | void;
  transformHtmlContent?: (
    html: string,
    elements: Element[],
  ) => string | Promise<string>;
  transformAgentContext?: (
    context: AgentContext,
    elements: Element[],
  ) => AgentContext | Promise<AgentContext>;
  transformActionContext?: (context: ActionContext) => ActionContext;
  transformOpenFileUrl?: (
    url: string,
    filePath: string,
    lineNumber?: number,
  ) => string;
  transformSnippet?: (
    snippet: string,
    element: Element,
  ) => string | Promise<string>;
}

export interface ToolbarEntry {
  id: string;
  /**
   * HTML content for the button icon. Can be:
   * - An emoji string: "🔍"
   * - SVG markup: "<svg>...</svg>"
   * - Any HTML: "<span style='color:red'>X</span>"
   * Rendered via innerHTML inside the button.
   */
  icon: string;
  tooltip?: string;
  badge?: string | number;
  isVisible?: boolean;
  /**
   * Called on button click. If onRender is NOT defined,
   * this is a simple action button (no dropdown).
   * If onRender IS defined, onClick fires before the dropdown opens.
   */
  onClick?: (handle: ToolbarEntryHandle) => void;
  /**
   * Called when the dropdown container opens.
   * Receives a raw HTMLElement to render into (framework-agnostic).
   * Return an optional cleanup function called when the dropdown closes.
   */
  onRender?: (
    container: HTMLElement,
    handle: ToolbarEntryHandle,
  ) => (() => void) | void;
}

export interface ToolbarEntryHandle {
  api: ReactGrabAPI;
  isOpen: () => boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setIcon: (icon: string) => void;
  setTooltip: (tooltip: string) => void;
  setBadge: (badge: string | number | undefined) => void;
  setVisible: (isVisible: boolean) => void;
}

export interface PluginConfig {
  theme?: DeepPartial<Theme>;
  options?: SettableOptions;
  actions?: ContextMenuAction[];
  toolbarEntries?: ToolbarEntry[];
  hooks?: PluginHooks;
  cleanup?: () => void;
}

export interface CopyWithLabelOptions {
  element: Element;
  cursorX: number;
  selectedElements?: Element[];
  extraPrompt?: string;
  shouldDeactivateAfter?: boolean;
  onComplete?: () => void;
  dragRect?: {
    pageX: number;
    pageY: number;
    width: number;
    height: number;
  };
}

export interface BuildActionContextOptions {
  element: Element;
  filePath: string | undefined;
  lineNumber: number | undefined;
  tagName: string | undefined;
  componentName: string | undefined;
  position: Position;
  performWithFeedbackOptions?: PerformWithFeedbackOptions;
  shouldDeferHideContextMenu: boolean;
  onBeforeCopy?: () => void;
  onBeforePrompt?: () => void;
  customEnterPromptMode?: (agent?: AgentOptions) => void;
}

/**
 * Shared mutable bag for cross-plugin function registration.
 * Plugins write their functions during setup() and read others at runtime.
 * By the time any event fires, all plugins have finished setup.
 */
export interface SharedPluginApi {
  performCopyWithLabel?: (options: CopyWithLabelOptions) => void;
  openContextMenu?: (position: Position, element: Element) => void;
  activateRenderer?: () => void;
  deactivateRenderer?: () => void;
  toggleActivate?: () => void;
  forceDeactivateAll?: () => void;
  preparePromptMode?: (position: Position, element: Element) => void;
  activatePromptMode?: () => void;
  handleComment?: () => void;
  enterCommentModeForElement?: (element: Element) => void;
  buildActionContext?: (
    options: BuildActionContextOptions,
  ) => ContextMenuActionContext;
  createPerformWithFeedback?: (
    options?: PerformWithFeedbackOptions,
  ) => (action: () => Promise<boolean>) => Promise<void>;
  dismissAllPopups?: () => void;
  dismissToolbarPopups?: () => void;
  clearArrowNavigation?: () => void;
  hasArrowNavigation?: () => boolean;
  showTemporaryGrabbedBox?: (element: Element) => void;
  createLabelInstance?: (
    element: Element,
    tagName: string,
    componentName: string | undefined,
    cursorX: number,
    options?: {
      elements?: Element[];
      boundsMultiple?: OverlayBounds[];
      extraPrompt?: string;
      hideArrow?: boolean;
    },
  ) => string;
  updateLabelAfterCopy?: (
    labelId: string,
    didSucceed: boolean,
    errorMessage?: string,
  ) => void;
  clearAllLabels?: () => void;
  handleCopySuccessWithComments?: (
    elements: Element[],
    commentText: string | undefined,
  ) => void;
  handleToggleEnabled?: () => void;
  handleSetDefaultAction?: (actionId: string) => void;
  updateToolbarState?: (updates: Partial<ToolbarState>) => void;
  setCopyStartPosition?: (position: Position, element: Element) => void;
  isRendererActive?: () => boolean;
  isEnabled?: () => boolean;
  shakeToolbar?: () => void;
  handleInputSubmit?: () => void;
  handleInputCancel?: () => void;
  isAgentProcessing?: () => boolean;
  isCopyFeedbackCooldownActive?: () => boolean;
  clearCopyFeedbackCooldown?: () => void;
  cancelActiveDrag?: () => void;
  getDragBounds?: () => OverlayBounds | null;
  isDragBoxVisible?: () => boolean;
  clearHoldTimer?: () => void;
  resetCopyConfirmation?: () => void;
  isHoldingKeys?: () => boolean;
  // Kernel-facing accessors
  isToolbarSelectHovered?: () => boolean;
  setIsToolbarSelectHovered?: (value: boolean) => void;
  hasDragPreviewBounds?: () => boolean;
  setHasDragPreviewBounds?: (value: boolean) => void;
  openTrackedDropdown?: (
    setPosition: (anchor: DropdownAnchor) => void,
  ) => void;
  stopTrackingDropdownPosition?: () => void;
  getCurrentToolbarState?: () => ToolbarState | null;
  getAgentSessionCount?: () => number;
  syncAgentFromRegistry?: () => void;
  subscribeToToolbarStateChanges?: (
    callback: (state: ToolbarState) => void,
  ) => () => void;
  copyWithFallback?: (
    elements: Element[],
    extraPrompt?: string,
  ) => Promise<boolean>;
  toggleToolbarEntry?: (entryId: string) => void;
  closeToolbarEntry?: () => void;
  setEnabled?: (enabled: boolean) => void;
}

export interface DerivedState {
  isHoldingKeys: () => boolean;
  isActivated: () => boolean;
  isCopying: () => boolean;
  didJustCopy: () => boolean;
  isPromptMode: () => boolean;
  isDragging: () => boolean;
  isFrozenPhase: () => boolean;
  isRendererActive: () => boolean;
  targetElement: () => Element | null;
  effectiveElement: () => Element | null;
  selectionElement: () => Element | undefined;
  frozenElementsBounds: () => OverlayBounds[];
}

export interface PluginContext {
  store: import("./core/store.js").GrabStore;
  actions: import("./core/store.js").GrabActions;
  derived: DerivedState;
  registry: {
    store: {
      theme: Required<Theme>;
      options: import("./core/plugin-registry.js").OptionsState;
      actions: ContextMenuAction[];
      toolbarEntries: ToolbarEntry[];
      toolbarEntryOverrides: Record<
        string,
        Partial<Pick<ToolbarEntry, "icon" | "tooltip" | "badge" | "isVisible">>
      >;
    };
    hooks: import("./core/plugin-registry.js").PluginRegistryHooks;
    updateToolbarEntry: (
      entryId: string,
      updates: Partial<
        Pick<ToolbarEntry, "icon" | "tooltip" | "badge" | "isVisible">
      >,
    ) => void;
    setOptions: (options: SettableOptions) => void;
  };
  api: ReactGrabAPI;
  events: import("./core/events.js").EventListenerManager;
  shared: SharedPluginApi;
  onKeyDown: (handler: (event: KeyboardEvent) => boolean) => void;
  onKeyUp: (handler: (event: KeyboardEvent) => boolean) => void;
  onPointerDown: (handler: (event: PointerEvent) => boolean) => void;
  onPointerMove: (handler: (event: PointerEvent) => boolean) => void;
  onPointerUp: (handler: (event: PointerEvent) => boolean) => void;
  onContextMenu: (handler: (event: MouseEvent) => boolean) => void;
  provide: <K extends keyof ReactGrabRendererProps>(
    key: K,
    accessor: () => ReactGrabRendererProps[K],
  ) => void;
}

export interface InternalPlugin {
  name: string;
  priority?: number;
  setup: (ctx: PluginContext) => (() => void) | void;
}

export interface Plugin {
  name: string;
  theme?: DeepPartial<Theme>;
  options?: SettableOptions;
  actions?: ContextMenuAction[];
  toolbarEntries?: ToolbarEntry[];
  hooks?: PluginHooks;
  setup?: (api: ReactGrabAPI, hooks: ActionContextHooks) => PluginConfig | void;
}

export interface Options {
  enabled?: boolean;
  activationMode?: ActivationMode;
  keyHoldDuration?: number;
  allowActivationInsideInput?: boolean;
  maxContextLines?: number;
  activationKey?: ActivationKey;
  getContent?: (elements: Element[]) => Promise<string> | string;
  /**
   * Whether to freeze React state updates while React Grab is active.
   * This prevents UI changes from interfering with element selection.
   * @default true
   */
  freezeReactUpdates?: boolean;
}

export interface SettableOptions extends Options {
  enabled?: never;
}

export interface SourceInfo {
  filePath: string;
  lineNumber: number | null;
  componentName: string | null;
}

export interface ToolbarState {
  edge: "top" | "bottom" | "left" | "right";
  ratio: number;
  collapsed: boolean;
  enabled: boolean;
  defaultAction?: string;
}

export interface DropdownAnchor {
  x: number;
  y: number;
  edge: ToolbarState["edge"];
  toolbarWidth: number;
}

export interface ReactGrabAPI {
  activate: () => void;
  deactivate: () => void;
  toggle: () => void;
  comment: () => void;
  isActive: () => boolean;
  isEnabled: () => boolean;
  setEnabled: (enabled: boolean) => void;
  getToolbarState: () => ToolbarState | null;
  setToolbarState: (state: Partial<ToolbarState>) => void;
  onToolbarStateChange: (callback: (state: ToolbarState) => void) => () => void;
  dispose: () => void;
  copyElement: (elements: Element | Element[]) => Promise<boolean>;
  getSource: (element: Element) => Promise<SourceInfo | null>;
  getStackContext: (element: Element) => Promise<string>;
  getState: () => ReactGrabState;
  setOptions: (options: SettableOptions) => void;
  registerPlugin: (plugin: Plugin) => void;
  unregisterPlugin: (name: string) => void;
  getPlugins: () => string[];
  getDisplayName: (element: Element) => string | null;
  toggleToolbarEntry: (entryId: string) => void;
  closeToolbarEntry: () => void;
}

export interface OverlayBounds {
  borderRadius: string;
  height: number;
  transform: string;
  width: number;
  x: number;
  y: number;
}

export type SelectionLabelStatus =
  | "idle"
  | "copying"
  | "copied"
  | "fading"
  | "error";

export interface SelectionLabelInstance {
  id: string;
  bounds: OverlayBounds;
  boundsMultiple?: OverlayBounds[];
  tagName: string;
  componentName?: string;
  elementsCount?: number;
  status: SelectionLabelStatus;
  statusText?: string;
  isPromptMode?: boolean;
  inputValue?: string;
  createdAt: number;
  element?: Element;
  elements?: Element[];
  mouseX?: number;
  mouseXOffsetFromCenter?: number;
  mouseXOffsetRatio?: number;
  errorMessage?: string;
  hideArrow?: boolean;
}

export interface CommentItem {
  id: string;
  content: string;
  elementName: string;
  tagName: string;
  componentName?: string;
  elementsCount?: number;
  previewBounds?: OverlayBounds[];
  elementSelectors?: string[];
  commentText?: string;
  timestamp: number;
}

export interface ReactGrabRendererProps {
  selectionVisible?: boolean;
  selectionBounds?: OverlayBounds;
  selectionBoundsMultiple?: OverlayBounds[];
  selectionShouldSnap?: boolean;
  inspectVisible?: boolean;
  inspectBounds?: OverlayBounds[];
  selectionElementsCount?: number;
  selectionFilePath?: string;
  selectionLineNumber?: number;
  selectionTagName?: string;
  selectionComponentName?: string;
  selectionLabelVisible?: boolean;
  selectionLabelStatus?: SelectionLabelStatus;
  selectionActionCycleState?: ActionCycleState;
  selectionArrowNavigationState?: ArrowNavigationState;
  onArrowNavigationSelect?: (index: number) => void;
  inspectNavigationState?: ArrowNavigationState;
  onInspectSelect?: (index: number) => void;
  labelInstances?: SelectionLabelInstance[];
  dragVisible?: boolean;
  dragBounds?: OverlayBounds;
  grabbedBoxes?: Array<{
    id: string;
    bounds: OverlayBounds;
    createdAt: number;
  }>;
  mouseX?: number;
  isFrozen?: boolean;
  inputValue?: string;
  isPromptMode?: boolean;
  replyToPrompt?: string;
  hasAgent?: boolean;
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
  onShowContextMenuInstance?: (instanceId: string) => void;
  onLabelInstanceHoverChange?: (instanceId: string, isHovered: boolean) => void;
  onInputChange?: (value: string) => void;
  onInputSubmit?: () => void;
  onToggleExpand?: () => void;
  isPendingDismiss?: boolean;
  selectionLabelShakeCount?: number;
  onConfirmDismiss?: () => void;
  onCancelDismiss?: () => void;
  pendingAbortSessionId?: string | null;
  toolbarVisible?: boolean;
  isActive?: boolean;
  onToggleActive?: () => void;
  enabled?: boolean;
  onToggleEnabled?: () => void;
  shakeCount?: number;
  onToolbarStateChange?: (state: ToolbarState) => void;
  onSubscribeToToolbarStateChanges?: (
    callback: (state: ToolbarState) => void,
  ) => () => void;
  onToolbarSelectHoverChange?: (isHovered: boolean) => void;
  onToolbarRef?: (element: HTMLDivElement) => void;
  contextMenuPosition?: Position | null;
  contextMenuBounds?: OverlayBounds | null;
  contextMenuTagName?: string;
  contextMenuComponentName?: string;
  contextMenuHasFilePath?: boolean;
  actions?: ContextMenuAction[];
  actionContext?: ActionContext;
  onContextMenuDismiss?: () => void;
  onContextMenuHide?: () => void;
  commentItems?: CommentItem[];
  commentsDisconnectedItemIds?: Set<string>;
  commentItemCount?: number;
  clockFlashTrigger?: number;
  commentsDropdownPosition?: DropdownAnchor | null;
  isCommentsPinned?: boolean;
  onToggleComments?: () => void;
  onCopyAll?: () => void;
  onCopyAllHover?: (isHovered: boolean) => void;
  onCommentsButtonHover?: (isHovered: boolean) => void;
  onCommentItemSelect?: (item: CommentItem) => void;
  onCommentItemHover?: (commentItemId: string | null) => void;
  onCommentsCopyAll?: () => void;
  onCommentsCopyAllHover?: (isHovered: boolean) => void;
  onCommentsClear?: () => void;
  onCommentsDismiss?: () => void;
  onCommentsDropdownHover?: (isHovered: boolean) => void;
  toolbarMenuPosition?: DropdownAnchor | null;
  toolbarMenuActions?: ContextMenuAction[];
  defaultActionId?: string;
  onSetDefaultAction?: (actionId: string) => void;
  onToggleToolbarMenu?: () => void;
  onToolbarMenuDismiss?: () => void;
  clearPromptPosition?: DropdownAnchor | null;
  onClearCommentsConfirm?: () => void;
  onClearCommentsCancel?: () => void;
  toolbarEntries?: ToolbarEntry[];
  toolbarEntryOverrides?: Record<
    string,
    Partial<Pick<ToolbarEntry, "icon" | "tooltip" | "badge" | "isVisible">>
  >;
  activeToolbarEntryId?: string | null;
  activeToolbarEntryHandle?: ToolbarEntryHandle | null;
  toolbarEntryDropdownPosition?: DropdownAnchor | null;
  onToggleToolbarEntry?: (entryId: string) => void;
  onToolbarEntryDismiss?: () => void;
}

export interface GrabbedBox {
  id: string;
  bounds: OverlayBounds;
  createdAt: number;
  element?: Element;
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
  leftPercent: number;
  leftOffsetPx: number;
  color?: string;
  labelWidth?: number;
}

export interface TagBadgeProps {
  tagName: string;
  componentName?: string;
  isClickable: boolean;
  onClick: (event: MouseEvent) => void;
  onHoverChange?: (hovered: boolean) => void;
  shrink?: boolean;
  forceShowIcon?: boolean;
}

export interface BottomSectionProps {
  children: import("solid-js").JSX.Element;
}

export interface DiscardPromptProps {
  label?: string;
  cancelOnEscape?: boolean;
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
  onFadingChange?: (isFading: boolean) => void;
  onShowContextMenu?: () => void;
}

export interface SelectionLabelProps {
  tagName?: string;
  componentName?: string;
  elementsCount?: number;
  selectionBounds?: OverlayBounds;
  mouseX?: number;
  visible?: boolean;
  isPromptMode?: boolean;
  inputValue?: string;
  replyToPrompt?: string;
  previousPrompt?: string;
  hasAgent?: boolean;
  status?: SelectionLabelStatus;
  statusText?: string;
  filePath?: string;
  supportsUndo?: boolean;
  supportsFollowUp?: boolean;
  dismissButtonText?: string;
  actionCycleState?: ActionCycleState;
  arrowNavigationState?: ArrowNavigationState;
  onArrowNavigationSelect?: (index: number) => void;
  inspectNavigationState?: ArrowNavigationState;
  onInspectSelect?: (index: number) => void;
  onInputChange?: (value: string) => void;
  onSubmit?: () => void;
  onToggleExpand?: () => void;
  onAbort?: () => void;
  onOpen?: () => void;
  onDismiss?: () => void;
  onUndo?: () => void;
  onFollowUpSubmit?: (prompt: string) => void;
  isPendingDismiss?: boolean;
  selectionLabelShakeCount?: number;
  onConfirmDismiss?: () => void;
  onCancelDismiss?: () => void;
  isPendingAbort?: boolean;
  onConfirmAbort?: () => void;
  onCancelAbort?: () => void;
  error?: string;
  onAcknowledgeError?: () => void;
  onRetry?: () => void;
  isContextMenuOpen?: boolean;
  onShowContextMenu?: () => void;
  onHoverChange?: (isHovered: boolean) => void;
  hideArrow?: boolean;
}

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

export type ActivationMode = "toggle" | "hold";

export type OverlayDismissSource = "keyboard" | "pointer";

export interface ActionContextHooks {
  transformHtmlContent: (html: string, elements: Element[]) => Promise<string>;
  onOpenFile: (filePath: string, lineNumber?: number) => boolean | void;
  transformOpenFileUrl: (url: string, filePath: string, lineNumber?: number) => string;
}

export interface ActionContext {
  element: Element;
  elements: Element[];
  filePath?: string;
  lineNumber?: number;
  componentName?: string;
  tagName?: string;
  enterPromptMode?: () => void;
  hooks: ActionContextHooks;
  performWithFeedback: (action: () => Promise<boolean>) => Promise<void>;
  hideContextMenu: () => void;
  cleanup: () => void;
}

export interface ContextMenuActionContext extends ActionContext {
  copy?: () => void;
  enterEditMode?: () => void;
}

interface EditablePropertyBase {
  // Stable identity across renders and sessionStorage. For aggregates this
  // is a comma-joined cssProperties (e.g. "padding-top,padding-bottom") so
  // the key survives DOM round-trips without parsing back.
  key: string;
  label: string;
  cssProperties: readonly string[];
  tailwindAliases: string[];
  isPrioritized: boolean;
  isDefault: boolean;
  // True when this entry is the highest-level form that captures the
  // current snapshot (e.g. "padding" when all 4 sides are equal). Default
  // view shows only canonical rows; searching surfaces the rest.
  isCanonical: boolean;
}

export interface NumericEditableProperty extends EditablePropertyBase {
  kind: "numeric";
  min: number;
  max: number;
  value: number;
  original: number;
  unit: string;
}

export interface ColorEditableProperty extends EditablePropertyBase {
  kind: "color";
  value: string;
  original: string;
}

export interface EnumEditableOption {
  value: string;
  label: string;
}

export interface EnumEditableProperty extends EditablePropertyBase {
  kind: "enum";
  value: string;
  original: string;
  options: ReadonlyArray<EnumEditableOption>;
}

export type EditableProperty =
  | NumericEditableProperty
  | ColorEditableProperty
  | EnumEditableProperty;

interface NumericPendingEdit {
  kind: "numeric";
  key: string;
  cssProperties: readonly string[];
  value: number;
  unit: string;
}

interface ColorPendingEdit {
  kind: "color";
  key: string;
  cssProperties: readonly string[];
  value: string;
}

interface EnumPendingEdit {
  kind: "enum";
  key: string;
  cssProperties: readonly string[];
  value: string;
}

export type PendingEdit = NumericPendingEdit | ColorPendingEdit | EnumPendingEdit;

export type PendingEdits = PendingEdit[];

export interface PendingEditsEntry {
  filePath: string;
  lineNumber: number;
  edits: PendingEdits;
}

export interface PreviewStyles {
  apply: (cssProperties: readonly string[], cssValue: string) => void;
  restore: () => void;
  forget: () => void;
  hasAppliedStyles: () => boolean;
}

export interface EditPanelState {
  element: Element;
  position: Position;
  selectionBounds: OverlayBounds;
  properties: EditableProperty[];
  preview: PreviewStyles;
  filePath?: string;
  lineNumber?: number;
  componentName?: string;
  tagName?: string;
  htmlPreview?: string;
  initialSearchQuery?: string;
}

export interface ContextMenuAction {
  id: string;
  label: string;
  shortcut?: string;
  shortcutModifier?: boolean;
  showInToolbarMenu?: boolean;
  enabled?: boolean | ((context: ActionContext) => boolean);
  onAction: (context: ContextMenuActionContext) => void | Promise<void>;
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
  transformCopyContent?: (content: string, elements: Element[]) => string | Promise<string>;
  onAfterCopy?: (elements: Element[], success: boolean) => void;
  onCopySuccess?: (elements: Element[], content: string) => void;
  onCopyError?: (error: Error) => void;
  onStateChange?: (state: ReactGrabState) => void;
  onPromptModeChange?: (isPromptMode: boolean, context: PromptModeContext) => void;
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
  transformHtmlContent?: (html: string, elements: Element[]) => string | Promise<string>;
  transformAgentContext?: (
    context: AgentContext,
    elements: Element[],
  ) => AgentContext | Promise<AgentContext>;
  transformActionContext?: (context: ActionContext) => ActionContext;
  transformOpenFileUrl?: (url: string, filePath: string, lineNumber?: number) => string;
}

export interface PluginConfig {
  theme?: DeepPartial<Theme>;
  options?: SettableOptions;
  actions?: ContextMenuAction[];
  hooks?: PluginHooks;
  cleanup?: () => void;
}

export interface Plugin {
  name: string;
  theme?: DeepPartial<Theme>;
  options?: SettableOptions;
  actions?: ContextMenuAction[];
  hooks?: PluginHooks;
  setup?: (api: ReactGrabAPI, hooks: ActionContextHooks) => PluginConfig | void;
}

export interface Options {
  enabled?: boolean;
  activationMode?: ActivationMode;
  keyHoldDuration?: number;
  allowActivationInsideInput?: boolean;
  activationKey?: ActivationKey;
  getContent?: (elements: Element[]) => Promise<string> | string;
  /**
   * Whether to freeze React state updates while React Grab is active.
   * This prevents UI changes from interfering with element selection.
   * @default true
   */
  freezeReactUpdates?: boolean;
  /**
   * Whether to send the anonymous version check to react-grab.com on init.
   * Set to false to skip the version-check request.
   * @default true
   */
  telemetry?: boolean;
}

export interface SettableOptions extends Options {
  enabled?: never;
  telemetry?: never;
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
}

export interface OverlayBounds {
  borderRadius: string;
  height: number;
  width: number;
  x: number;
  y: number;
}

export type SelectionLabelStatus = "idle" | "copying" | "copied" | "fading" | "error";

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

export interface FrozenLabelEntry {
  tagName: string;
  componentName?: string;
  bounds: OverlayBounds;
  mouseX?: number;
}

export interface ReactGrabRendererProps {
  selectionVisible?: boolean;
  selectionBounds?: OverlayBounds;
  selectionBoundsMultiple?: OverlayBounds[];
  selectionShouldSnap?: boolean;
  selectionElementsCount?: number;
  frozenLabelEntries?: FrozenLabelEntry[];
  pendingShiftPreviewEntry?: FrozenLabelEntry;
  selectionFilePath?: string;
  selectionLineNumber?: number;
  selectionTagName?: string;
  selectionComponentName?: string;
  selectionLabelVisible?: boolean;
  selectionLabelStatus?: SelectionLabelStatus;
  selectionArrowNavigationState?: ArrowNavigationState;
  onArrowNavigationSelect?: (index: number) => void;
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
  onShowContextMenuInstance?: (instanceId: string) => void;
  onLabelInstanceHoverChange?: (instanceId: string, isHovered: boolean) => void;
  onInputChange?: (value: string) => void;
  onInputSubmit?: () => void;
  onToggleExpand?: () => void;
  isPendingDismiss?: boolean;
  selectionLabelShakeCount?: number;
  onConfirmDismiss?: () => void;
  onCancelDismiss?: () => void;
  toolbarVisible?: boolean;
  isActive?: boolean;
  onToggleActive?: () => void;
  isScanning?: boolean;
  scanAvailable?: boolean;
  onToggleScan?: () => void;
  scanCopiedToken?: number | null;
  onActivateAction?: (actionId: string) => void;
  activeActionId?: string | null;
  enabled?: boolean;
  shakeCount?: number;
  onToolbarStateChange?: (state: ToolbarState) => void;
  onSubscribeToToolbarStateChanges?: (callback: (state: ToolbarState) => void) => () => void;
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
  toolbarMenuPosition?: DropdownAnchor | null;
  toolbarMenuActions?: ContextMenuAction[];
  defaultActionId?: string;
  onSetDefaultAction?: (actionId: string) => void;
  onToggleToolbarMenu?: () => void;
  onToolbarMenuDismiss?: () => void;
  editPanelState?: EditPanelState | null;
  editPanelPosition?: DropdownAnchor | null;
  onEditPanelDismiss?: () => void;
  onEditPanelSubmit?: (prompt: string) => void;
  onEditPanelInteractingChange?: (interacting: boolean) => void;
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
  onDismiss?: () => void;
  onFadingChange?: (isFading: boolean) => void;
  onShowContextMenu?: () => void;
}

export interface ScanLoafScript {
  sourceURL: string;
  sourceFunctionName: string;
  sourceCharPosition: number;
  durationMs: number;
  forcedStyleAndLayoutDurationMs: number;
}

export interface ScanLongAnimationFrame {
  startTimeMs: number;
  durationMs: number;
  blockingDurationMs: number;
  renderStartMs: number;
  firstUIEventTimestampMs: number;
  scripts: ScanLoafScript[];
}

export interface ScanFiberChange {
  isFirstMount: boolean;
  props: string[] | null;
  state: boolean;
  context: boolean;
  hooks: number[];
  parent: boolean;
}

export interface ScanRenderedFiber {
  name: string;
  actualDurationMs: number;
  selfDurationMs: number;
  source: string | null;
  change: ScanFiberChange | null;
}

export interface ScanCommit {
  timestampMs: number;
  totalActualDurationMs: number;
  renderedFiberCount: number;
  fibers: ScanRenderedFiber[];
}

export interface ScanTrace {
  startedAtEpochMs: number;
  durationMs: number;
  commitCount: number;
  commits: ScanCommit[];
  longAnimationFrames: ScanLongAnimationFrame[];
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
  status?: SelectionLabelStatus;
  statusText?: string;
  filePath?: string;
  shouldToggleExpandOnClick?: boolean;
  arrowNavigationState?: ArrowNavigationState;
  onArrowNavigationSelect?: (index: number) => void;
  onInputChange?: (value: string) => void;
  onSubmit?: () => void;
  onToggleExpand?: () => void;
  onOpen?: () => void;
  onDismiss?: () => void;
  isPendingDismiss?: boolean;
  selectionLabelShakeCount?: number;
  onConfirmDismiss?: () => void;
  onCancelDismiss?: () => void;
  error?: string;
  onAcknowledgeError?: () => void;
  onRetry?: () => void;
  isContextMenuOpen?: boolean;
  onShowContextMenu?: () => void;
  onHoverChange?: (isHovered: boolean) => void;
  hideArrow?: boolean;
}

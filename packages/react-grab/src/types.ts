export interface Position {
  x: number;
  y: number;
}

export interface EyeDropperResult {
  sRGBHex: string;
}

export interface EyeDropperInstance {
  open: (options?: { signal?: AbortSignal }) => Promise<EyeDropperResult>;
}

declare global {
  interface Window {
    EyeDropper?: {
      new (): EyeDropperInstance;
    };
  }
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

export interface DesignTokenResolver {
  // Whether the page exposes any color/length design tokens at all.
  readonly hasTokens: boolean;
  // Returns the matching custom property name (e.g. "--primary") for a hex
  // color, or null when no token resolves to that value.
  matchColor: (hex: string) => string | null;
  // Returns the matching custom property name for a px length, gated on the
  // token name sharing the css property's family so unrelated scales that
  // happen to share a value (font-size vs spacing) don't cross-match.
  matchLength: (px: number, cssProperty: string) => string | null;
  // Returns the next/previous px value on the css property's token scale
  // relative to `px`, or null when there is no token scale for the family or
  // `px` sits outside it (so the caller can fall back to a raw step instead of
  // dead-ending or teleporting across the scale).
  stepLength: (px: number, direction: 1 | -1, cssProperty: string) => number | null;
}

export interface PendingEditsEntry {
  filePath: string;
  lineNumber: number;
  edits: PendingEdits;
  designTokens?: DesignTokenResolver;
}

export interface PreviewStyles {
  apply: (cssProperties: readonly string[], cssValue: string) => void;
  restore: () => void;
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
  hasSessionEdits?: boolean;
  designTokens?: DesignTokenResolver;
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

// A predicate over a DOM element (e.g. "is this element grabbable?").
export interface ElementPredicate {
  (element: Element): boolean;
}

// A single rendered row of the hierarchy dropdown (renderer-facing: no element
// reference, only what is drawn).
export interface HierarchyItem {
  tagName: string;
  componentName?: string;
  // Indentation level within the hierarchy tree (0 = outermost ancestor).
  depth: number;
  // Whether this row is the last among its displayed siblings, used to pick
  // the terminal-style connector glyph (└─ vs ├─).
  isLast: boolean;
}

// Internal hierarchy node that pairs a real DOM element with its position in
// the rendered ancestor/sibling/child tree. The element reference is kept in
// core (never sent to the renderer).
export interface HierarchyEntry {
  element: Element;
  depth: number;
  isLast: boolean;
}

export interface HierarchyState {
  items: HierarchyItem[];
  activeIndex: number;
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
  /**
   * Confine React Grab to a single container element instead of the whole page.
   * Hit-testing, the toolbar viewport, and scroll re-anchoring are scoped to it.
   * Used by the demo build to scope the showcase to its card.
   */
  container?: HTMLElement;
  activationMode?: ActivationMode;
  keyHoldDuration?: number;
  allowActivationInsideInput?: boolean;
  activationKey?: ActivationKey;
  getContent?: (elements: Element[]) => Promise<string> | string;
  /**
   * Maximum number of source-location lines included in the copied / prompted
   * context for a grabbed element. Larger apps often render a target through
   * several wrapper components, so the compact default can point an agent at a
   * wrapper instead of the meaningful surface. Raise this to opt into a deeper,
   * more detailed trace. Low-signal library frames are always surfaced for free
   * and never count against this budget.
   * @default 3
   */
  maxContextLines?: number;
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
  container?: never;
}

export interface SourceInfo {
  filePath: string;
  lineNumber: number | null;
  componentName: string | null;
}

export interface SelectedElementPayload {
  tagName: string;
  id?: string;
  className?: string;
  textContent?: string;
  componentName?: string;
  filePath?: string;
  lineNumber?: number;
  columnNumber?: number;
}

export interface ElementSelectedEventDetail {
  elements: SelectedElementPayload[];
}

declare global {
  interface WindowEventMap {
    "react-grab:element-selected": CustomEvent<ElementSelectedEventDetail>;
  }
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
  reset: () => void;
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
  hierarchyState?: HierarchyState;
  hierarchyMenuPosition?: DropdownAnchor | null;
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
  selectionLabelShakeCount?: number;
  onConfirmDismiss?: () => void;
  discardPrompt?: SelectionDiscardPrompt;
  toolbarVisible?: boolean;
  isActive?: boolean;
  onToggleActive?: () => void;
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
  onEditPanelSubmit?: (pendingEdits: PendingEdits) => void;
  onEditPanelPendingEditsChange?: (pendingEdits: PendingEdits) => void;
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
}

export interface BottomSectionProps {
  children: import("solid-js").JSX.Element;
}

export interface DiscardPromptProps {
  label?: string;
  showCancel?: boolean;
  cancelOnEscape?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  onCopy?: () => void;
}

export interface SelectionDiscardPrompt {
  isKeyboardSelection?: boolean;
  label?: string;
  cancelOnEscape?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  onCopy?: () => void;
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
  onInputChange?: (value: string) => void;
  onSubmit?: () => void;
  onToggleExpand?: () => void;
  onOpen?: () => void;
  onDismiss?: () => void;
  selectionLabelShakeCount?: number;
  onConfirmDismiss?: () => void;
  discardPrompt?: SelectionDiscardPrompt;
  error?: string;
  onAcknowledgeError?: () => void;
  onRetry?: () => void;
  isContextMenuOpen?: boolean;
  onShowContextMenu?: () => void;
  onHoverChange?: (isHovered: boolean) => void;
  hideArrow?: boolean;
}

export interface SourceLocation extends SourceInfo {
  columnNumber: number | null;
}

export interface ReactGrabStackFrame {
  functionName?: string;
  fileName?: string;
  lineNumber?: number;
  columnNumber?: number;
  isServer?: boolean;
  isSymbolicated?: boolean;
}

export interface ReactGrabEntry {
  tagName?: string;
  componentName?: string;
  content: string;
  commentText?: string;
  source?: SourceLocation | null;
  stackContext?: string;
  frames?: ReactGrabStackFrame[];
}

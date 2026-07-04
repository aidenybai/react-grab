export interface CaptureRegionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CaptureOptions {
  scale?: number;
  pixelRatio?: number;
  backgroundColor?: string;
  embedFonts?: boolean;
  bleed?: number | "auto";
  clip?: CaptureRegionRect;
  filterNode?: (element: Element) => boolean;
  resolveIframeContent?: (iframe: HTMLIFrameElement) => Promise<string | null>;
  timeoutMs?: number;
  abortSignal?: AbortSignal;
}

export interface CaptureRegionOptions extends Omit<CaptureOptions, "clip" | "bleed"> {
  root?: Element;
  cullMarginPx?: number;
}

export interface CaptureResult {
  width: number;
  height: number;
  toSvgDataUrl: () => Promise<string>;
  toCanvas: () => Promise<HTMLCanvasElement>;
  toBlob: () => Promise<Blob>;
  toPngDataUrl: () => Promise<string>;
}

export interface ResolvedCaptureOptions {
  scale: number;
  pixelRatio: number;
  backgroundColor: string | undefined;
  embedFonts: boolean;
  bleed: number | "auto";
  clip: CaptureRegionRect | undefined;
  prunedElements: ReadonlySet<Element> | undefined;
  filterNode: ((element: Element) => boolean) | undefined;
  resolveIframeContent: ((iframe: HTMLIFrameElement) => Promise<string | null>) | undefined;
  timeoutMs: number;
  abortSignal: AbortSignal | undefined;
}

export interface StyleDeclarationMap {
  [propertyName: string]: string | undefined;
}

export interface RelevantStylePropRegistry {
  propertyNames: string[];
  perElementPropertyNames: string[];
  styleRelevantAttributeNames: ReadonlySet<string>;
  getUnstableSelectorList: (propertyName: string) => readonly string[] | null;
  isStyleMemoSafe: () => boolean;
  isPseudoContentMemoSafe: () => boolean;
  addInlineStyleProps: (inlineStyle: CSSStyleDeclaration) => void;
  addParsedInlineDeclaration: (propertyName: string, declaredValue: string) => void;
  addShadowRootStyleProps: (shadowRoot: ShadowRoot) => boolean;
  isInlineCarrySafe: () => boolean;
}

export interface MemoizedElementStyles {
  styles: StyleDeclarationMap;
  beforeStyles: StyleDeclarationMap | null;
  afterStyles: StyleDeclarationMap | null;
  laneSkipMask: readonly boolean[] | null;
}

export interface ElementReadSnapshot {
  styles: StyleDeclarationMap;
  beforeStyles: StyleDeclarationMap | null;
  afterStyles: StyleDeclarationMap | null;
  firstLetterStyles: StyleDeclarationMap | null;
  markerStyles: StyleDeclarationMap | null;
  parentElement: Element | null;
  scrollLeft: number;
  scrollTop: number;
  memoKey: number;
}

export interface ComposedTreeSnapshot {
  snapshotByElement: Map<Element, ElementReadSnapshot>;
  perElementPropertyNames: readonly string[];
  persistedVariantEmittedStyles: Map<number, Map<string, StyleDeclarationMap>> | null;
  inlineCarryTextByElement: Map<Element, string>;
}

export interface ParsedInlineDeclaration {
  propertyName: string;
  propertyValue: string;
  isImportant: boolean;
}

export interface InlineStyleScan {
  carryText: string;
  descriptorWithCarry: string;
  descriptorPlain: string;
  registryFeed: readonly (readonly [string, string])[] | null;
}

export interface PseudoRulePreflight {
  definesBeforeAfter: boolean;
  definesFirstLetter: boolean;
  definesMarker: boolean;
}

export interface StyleRuleRecord {
  className: string;
  signature: string;
  baseStyles: StyleDeclarationMap;
  beforeStyles: StyleDeclarationMap | null;
  afterStyles: StyleDeclarationMap | null;
  firstLetterStyles: StyleDeclarationMap | null;
  markerStyles: StyleDeclarationMap | null;
  cachedBlocks: StyleRuleDeclarationBlocks | null;
}

export interface StyleRuleDeclarationBlocks {
  base: string;
  before: string;
  after: string;
  firstLetter: string;
  marker: string;
}

export interface StyleRegistry {
  rules: StyleRuleRecord[];
  register: (
    baseStyles: StyleDeclarationMap,
    beforeStyles: StyleDeclarationMap | null,
    afterStyles: StyleDeclarationMap | null,
    firstLetterStyles: StyleDeclarationMap | null,
    markerStyles: StyleDeclarationMap | null,
  ) => string;
  toCssText: () => string;
}

export interface StyleSandbox {
  getBaseline: (
    element: Element,
    pseudoSelector: string | null,
    snapshotStyles: StyleDeclarationMap,
  ) => StyleDeclarationMap;
  dispose: () => void;
}

export interface DiffStylesInput {
  styles: StyleDeclarationMap;
  baseline: StyleDeclarationMap;
  parentStyles: StyleDeclarationMap | null;
  parentEmittedStyles: StyleDeclarationMap | null;
}

export interface InternalCaptureContext {
  suppressedBackdropElements: Set<Element> | null;
  skipBackdropFilterBaking: boolean;
  presnapshottedTree?: ComposedTreeSnapshot;
}

export interface BackdropUnderlayClip {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BakeBackdropFilterUnderlaysInput {
  underlayCanvas: HTMLCanvasElement;
  ownerDocument: Document;
  rootElement: Element;
  backdropFilterElements: Element[];
  snapshotByElement: Map<Element, ElementReadSnapshot>;
  pixelRatio: number;
  backgroundColor: string | undefined;
  underlayOffsetLeftPx: number;
  underlayOffsetTopPx: number;
}

export interface IframeBridgeRequestMessage {
  type: string;
  requestId: string;
  pixelRatio: number;
}

export interface IframeBridgeResponseMessage {
  type: string;
  requestId: string;
  pngDataUrl: string;
  widthPx: number;
  heightPx: number;
  backgroundColor: string | null;
}

export interface IframeContentSnapshot {
  pngDataUrl: string;
  widthPx: number;
  heightPx: number;
  canvasBackgroundColor: string | null;
}

export interface CloneContext {
  ownerDocument: Document;
  classNameByElement: Map<Element, string>;
  snapshotByElement: Map<Element, ElementReadSnapshot>;
  cloneByElement: Map<Element, Element>;
  iframeContentByElement: Map<Element, IframeContentSnapshot>;
  prunedElements: ReadonlySet<Element> | undefined;
  inlineCarryTextByElement: Map<Element, string>;
}

export interface InlineSvgUseReferencesInput {
  clone: Element;
  rules: StyleRuleRecord[];
  sourceDocument: Document;
  timeoutMs: number;
}

export interface FifoCache<Value> {
  get: (key: string) => Value | undefined;
  set: (key: string, value: Value) => void;
  delete: (key: string) => void;
}

export interface SrcsetCandidate {
  url: string;
  density: number;
}

export interface FontFaceRuleSource {
  rule: CSSFontFaceRule;
  baseUrl: string | null;
}

export interface FontFaceSourceCollection {
  ruleSources: FontFaceRuleSource[];
  inaccessibleSheetUrls: string[];
}

export interface LinearTransform {
  a: number;
  b: number;
  c: number;
  d: number;
}

export interface ElementTransformStyleValues {
  transform: string | undefined;
  rotate: string | undefined;
  scale: string | undefined;
}

export interface CaptureOutputGeometry {
  layoutWidthPx: number;
  layoutHeightPx: number;
  outputWidthPx: number;
  outputHeightPx: number;
  contentOffsetLeftPx: number;
  contentOffsetTopPx: number;
  rootLinearTransform: LinearTransform | null;
}

export interface ComputeRootOutputGeometryInput {
  rootElement: Element;
  rootStyles: StyleDeclarationMap;
  defaultView: Window;
  layoutWidthPx: number;
  layoutHeightPx: number;
  bleedPx: number;
}

export interface SerializeSvgInput {
  clone: Element;
  cssText: string;
  width: number;
  height: number;
  clip: CaptureRegionRect | null;
  ownerDocument: Document;
}

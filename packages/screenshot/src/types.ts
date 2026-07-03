export interface CaptureOptions {
  scale?: number;
  pixelRatio?: number;
  backgroundColor?: string;
  embedFonts?: boolean;
  bleed?: number | "auto";
  filterNode?: (element: Element) => boolean;
  resolveIframeContent?: (iframe: HTMLIFrameElement) => Promise<string | null>;
  timeoutMs?: number;
  abortSignal?: AbortSignal;
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
  filterNode: ((element: Element) => boolean) | undefined;
  resolveIframeContent: ((iframe: HTMLIFrameElement) => Promise<string | null>) | undefined;
  timeoutMs: number;
  abortSignal: AbortSignal | undefined;
}

export interface StyleDeclarationMap {
  [propertyName: string]: string;
}

export interface RelevantStylePropRegistry {
  propertyNames: string[];
  addInlineStyleProps: (inlineStyle: CSSStyleDeclaration) => void;
  addShadowRootStyleProps: (shadowRoot: ShadowRoot) => boolean;
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
}

export interface PseudoRulePreflight {
  definesBeforeAfter: boolean;
  definesFirstLetter: boolean;
  definesMarker: boolean;
}

export interface StyleRuleRecord {
  className: string;
  baseStyles: StyleDeclarationMap;
  beforeStyles: StyleDeclarationMap | null;
  afterStyles: StyleDeclarationMap | null;
  firstLetterStyles: StyleDeclarationMap | null;
  markerStyles: StyleDeclarationMap | null;
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
    fontSize: string | undefined,
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
}

export interface BakeBackdropFilterUnderlaysInput {
  underlayCanvas: HTMLCanvasElement;
  ownerDocument: Document;
  rootElement: Element;
  backdropFilterElements: Element[];
  snapshotByElement: Map<Element, ElementReadSnapshot>;
  pixelRatio: number;
  backgroundColor: string | undefined;
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
  ownerDocument: Document;
}

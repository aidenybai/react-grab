export type BenchAdapterKey =
  | "react-grab"
  | "snapdom"
  | "modern-screenshot"
  | "html-to-image"
  | "html2canvas"
  | "dom-to-image-more";

export interface BenchLibrarySpec {
  id: string;
  bundleRelativePath: string;
  adapterKey: BenchAdapterKey;
}

export interface BenchRunOutcome {
  coldMs: number;
  warmDurationsMs: number[];
  pngDataUrl: string;
}

export interface BenchResultEntry {
  fixtureId: string;
  libraryId: string;
  ok: boolean;
  error?: string;
  medianColdMs?: number;
  medianWarmMs?: number;
  p95WarmMs?: number;
  pngByteLength?: number;
  fidelityScore?: number;
  meanChannelDelta?: number;
  dimensionMismatch?: string;
}

export interface PngPairScore {
  score: number;
  meanChannelDelta: number;
}

export interface SnapdomCaptureOptions {
  scale?: number;
  dpr?: number;
  embedFonts?: boolean;
}

export interface SnapdomCaptureResult {
  toCanvas: (options?: SnapdomCaptureOptions) => Promise<HTMLCanvasElement>;
}

export interface ModernScreenshotOptions {
  scale?: number;
}

export interface ModernScreenshotGlobal {
  domToPng: (node: Node, options?: ModernScreenshotOptions) => Promise<string>;
}

export interface HtmlToImageOptions {
  pixelRatio?: number;
}

export interface HtmlToImageGlobal {
  toPng: (node: HTMLElement, options?: HtmlToImageOptions) => Promise<string>;
}

export interface Html2CanvasOptions {
  scale?: number;
}

export interface DomToImageMoreOptions {
  scale?: number;
}

export interface DomToImageMoreGlobal {
  toPng: (node: Node, options?: DomToImageMoreOptions) => Promise<string>;
}

declare global {
  interface Window {
    snapdom: (element: Element, options?: SnapdomCaptureOptions) => Promise<SnapdomCaptureResult>;
    modernScreenshot: ModernScreenshotGlobal;
    htmlToImage: HtmlToImageGlobal;
    html2canvas: (element: HTMLElement, options?: Html2CanvasOptions) => Promise<HTMLCanvasElement>;
    domtoimage: DomToImageMoreGlobal;
  }
}

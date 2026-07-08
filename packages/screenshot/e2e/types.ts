export interface HarnessCaptureOptions {
  pixelRatio?: number;
  scale?: number;
  bleed?: number | "auto";
}

export interface HarnessCaptureResult {
  width: number;
  height: number;
  toPngDataUrl: () => Promise<string>;
  toSvgDataUrl: () => Promise<string>;
  toJpegBlob: (quality?: number) => Promise<Blob>;
  toJpegDataUrl: (quality?: number) => Promise<string>;
}

export type FixtureBrowserEngine = "chromium" | "webkit" | "firefox";

export interface FixtureBrowserOverride {
  maxDiffRatio?: number;
  maxMeanChannelDelta?: number;
  maxDimensionDeltaPx?: number;
  skip?: boolean;
}

export interface FixtureSpec {
  id: string;
  maxDiffRatio: number;
  maxMeanChannelDelta?: number;
  maxDimensionDeltaPx?: number;
  waitMs?: number;
  scrollTargetIntoViewBeforeScreenshot?: boolean;
  screenshotClipTargetAabb?: boolean;
  screenshotClipExpandPx?: number;
  captureBleed?: number | "auto";
  preserveAnimations?: boolean;
  skip?: boolean;
  webkit?: FixtureBrowserOverride;
  firefox?: FixtureBrowserOverride;
}

export interface RegionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RegionFixtureSpec {
  id: string;
  region: RegionRect;
  maxDiffRatio: number;
  maxMeanChannelDelta?: number;
  webkit?: FixtureBrowserOverride;
  firefox?: FixtureBrowserOverride;
}

export interface TargetAabbClip {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FastHtmlToImageGlobal {
  captureNode: (element: Element, options?: HarnessCaptureOptions) => Promise<HarnessCaptureResult>;
  captureRegion: (
    region: RegionRect,
    options?: HarnessCaptureOptions,
  ) => Promise<HarnessCaptureResult>;
  prewarm: (target?: Document | Element) => Promise<void>;
}

export interface FidelityScoreEntry {
  id: string;
  browser: FixtureBrowserEngine;
  score: number;
  budget: number;
  meanChannelDelta: number;
  widthPx: number;
  heightPx: number;
}

declare global {
  interface Window {
    FastHtmlToImage: FastHtmlToImageGlobal;
  }
}

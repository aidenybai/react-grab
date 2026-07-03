export interface HarnessCaptureOptions {
  pixelRatio?: number;
  scale?: number;
  bleed?: number | "auto";
}

export interface HarnessCaptureResult {
  toPngDataUrl: () => Promise<string>;
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
  skip?: boolean;
}

export interface TargetAabbClip {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ReactGrabScreenshotGlobal {
  captureNode: (element: Element, options?: HarnessCaptureOptions) => Promise<HarnessCaptureResult>;
}

export interface FidelityScoreEntry {
  id: string;
  score: number;
  budget: number;
  meanChannelDelta: number;
  widthPx: number;
  heightPx: number;
}

declare global {
  interface Window {
    ReactGrabScreenshot: ReactGrabScreenshotGlobal;
  }
}

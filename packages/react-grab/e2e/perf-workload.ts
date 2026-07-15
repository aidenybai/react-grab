import type { Page } from "@playwright/test";
import { PERF_ANIMATION_INVENTORY_LIMIT } from "./perf-constants.js";

export interface PerfAnimationInventoryEntry {
  id: string;
  kind: string;
  target: string;
  playState: AnimationPlayState;
  currentTimeMs: number | null;
  delayMs: number;
  durationMs: number;
  iterations: number | null;
  infinite: boolean;
  easing: string;
  fill: FillMode;
  properties: string[];
}

export interface PerfWorkloadSnapshot {
  capturedAt: string;
  domElements: number;
  maximumDomDepth: number;
  openShadowRoots: number;
  iframeCount: number;
  stylesheetCount: number;
  accessibleCssRuleCount: number;
  inaccessibleStylesheetCount: number;
  activeAnimationCount: number;
  animationsTruncated: boolean;
  animations: PerfAnimationInventoryEntry[];
  canvasCount: number;
  imageCount: number;
  videoCount: number;
}

const captureWorkloadInPage = (animationInventoryLimit: number): PerfWorkloadSnapshot => {
  const roots: Array<Document | ShadowRoot> = [document];
  let openShadowRoots = 0;
  let domElements = 0;
  let maximumDomDepth = 0;
  let iframeCount = 0;
  let imageCount = 0;
  let videoCount = 0;
  const canvasElements: HTMLCanvasElement[] = [];

  for (let rootIndex = 0; rootIndex < roots.length; rootIndex++) {
    const root = roots[rootIndex];
    const elements = root.querySelectorAll("*");
    domElements += elements.length;
    for (const element of elements) {
      let depth = 0;
      let ancestor: Node | null = element;
      while (ancestor && ancestor !== root) {
        depth += 1;
        ancestor = ancestor.parentNode;
      }
      maximumDomDepth = Math.max(maximumDomDepth, depth);
      if (element instanceof HTMLIFrameElement) iframeCount += 1;
      if (element instanceof HTMLImageElement) imageCount += 1;
      if (element instanceof HTMLVideoElement) videoCount += 1;
      if (element instanceof HTMLCanvasElement) canvasElements.push(element);
      if (element.shadowRoot) {
        openShadowRoots += 1;
        roots.push(element.shadowRoot);
      }
    }
  }

  let accessibleCssRuleCount = 0;
  let inaccessibleStylesheetCount = 0;
  for (const stylesheet of document.styleSheets) {
    try {
      accessibleCssRuleCount += stylesheet.cssRules.length;
    } catch {
      inaccessibleStylesheetCount += 1;
    }
  }

  const allAnimations = document.getAnimations();
  const animations = allAnimations.slice(0, animationInventoryLimit).map((animation) => {
    const effect = animation.effect instanceof KeyframeEffect ? animation.effect : null;
    const target = effect?.target instanceof Element ? effect.target : null;
    const timing = effect?.getComputedTiming();
    const iterationCount = Number(timing?.iterations ?? 0);
    const properties = new Set<string>();
    for (const keyframe of effect?.getKeyframes() ?? []) {
      for (const propertyName of Object.keys(keyframe)) {
        if (
          propertyName !== "offset" &&
          propertyName !== "computedOffset" &&
          propertyName !== "easing" &&
          propertyName !== "composite"
        ) {
          properties.add(propertyName);
        }
      }
    }
    const targetSelector = target
      ? `${target.tagName.toLowerCase()}${target.id ? `#${target.id}` : ""}${
          target.classList.length > 0
            ? `.${[...target.classList]
                .slice(0, 3)
                .map((className) => CSS.escape(className))
                .join(".")}`
            : ""
        }`
      : "unknown";
    return {
      id: animation.id,
      kind: animation.constructor.name,
      target: targetSelector,
      playState: animation.playState,
      currentTimeMs: typeof animation.currentTime === "number" ? animation.currentTime : null,
      delayMs: Number(timing?.delay ?? 0),
      durationMs: typeof timing?.duration === "number" ? timing.duration : 0,
      iterations: Number.isFinite(iterationCount) ? iterationCount : null,
      infinite: !Number.isFinite(iterationCount),
      easing: String(timing?.easing ?? "linear"),
      fill: timing?.fill ?? "none",
      properties: [...properties].sort(),
    };
  });

  return {
    capturedAt: new Date().toISOString(),
    domElements,
    maximumDomDepth,
    openShadowRoots,
    iframeCount,
    stylesheetCount: document.styleSheets.length,
    accessibleCssRuleCount,
    inaccessibleStylesheetCount,
    activeAnimationCount: allAnimations.length,
    animationsTruncated: allAnimations.length > animations.length,
    animations,
    canvasCount: canvasElements.length,
    imageCount,
    videoCount,
  };
};

export const capturePerfWorkload = (page: Page): Promise<PerfWorkloadSnapshot> =>
  page.evaluate(captureWorkloadInPage, PERF_ANIMATION_INVENTORY_LIMIT);

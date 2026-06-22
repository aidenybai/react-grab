// The experimental HDR canvas surface ships in Chromium-based browsers but is
// not yet in the TypeScript DOM lib, so it must be merged into the built-in
// interfaces here. This lives in a real module (not a .d.ts) so the
// augmentation travels to every consumer that imports from this file.
declare global {
  interface CanvasRenderingContext2DSettings {
    colorType?: "unorm8" | "float16";
  }

  interface CanvasHighDynamicRangeOptions {
    mode?: "default" | "extended";
  }

  interface HTMLCanvasElement {
    configureHighDynamicRange?(options: CanvasHighDynamicRangeOptions): void;
  }
}

let cachedResult: boolean | null = null;

// An extended-range canvas on its own reserves the display's *full* HDR
// headroom, which forces the compositor to dim all surrounding SDR content to
// make room. We therefore only enable HDR when we can also cap that headroom
// via `dynamic-range-limit: constrained` — the spec value meant for SDR and HDR
// content coexisting comfortably. Requiring it here guarantees we never trade
// page-wide dimming for a brighter highlight.
const supportsConstrainedHdrCanvas = (): boolean => {
  if (!CSS.supports("dynamic-range-limit", "constrained")) return false;

  const probeCanvas = document.createElement("canvas");
  const probeContext = probeCanvas.getContext("2d", { colorType: "float16" });
  return (
    typeof probeCanvas.configureHighDynamicRange === "function" &&
    probeContext?.getContextAttributes().colorType === "float16"
  );
};

export const supportsHdr = (): boolean => {
  if (cachedResult !== null) return cachedResult;

  try {
    cachedResult =
      window.matchMedia("(dynamic-range: high)").matches && supportsConstrainedHdrCanvas();
  } catch {
    cachedResult = false;
  }

  return cachedResult;
};

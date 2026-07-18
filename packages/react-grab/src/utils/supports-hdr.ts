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

// Probes the extended-range capability the overlay relies on: a float16 2D
// backing plus the method that switches the visible canvas into HDR. With both,
// the highlight can be drawn far brighter than SDR white, and the compositor
// dims surrounding SDR content to make headroom — the intended dramatic effect.
const supportsHdrCanvas = (): boolean => {
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
    cachedResult = window.matchMedia("(dynamic-range: high)").matches && supportsHdrCanvas();
  } catch {
    cachedResult = false;
  }

  return cachedResult;
};

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

const supportsFloat16Canvas = (): boolean => {
  try {
    const probeContext = document
      .createElement("canvas")
      .getContext("2d", { colorType: "float16" });
    return probeContext?.getContextAttributes().colorType === "float16";
  } catch {
    return false;
  }
};

export const supportsHdr = (): boolean => {
  if (cachedResult !== null) return cachedResult;

  try {
    cachedResult = window.matchMedia("(dynamic-range: high)").matches && supportsFloat16Canvas();
  } catch {
    cachedResult = false;
  }

  return cachedResult;
};

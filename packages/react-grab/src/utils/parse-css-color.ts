interface RgbaColor {
  red: number;
  green: number;
  blue: number;
  alpha: number;
}

// Modern browsers serialize `getComputedStyle().backgroundColor` in the color
// space the author wrote it in (e.g. `oklch(1 0 0)` / `oklab(...)` / `color(...)`)
// rather than always normalizing to `rgb(...)`. Rather than hand-parse every
// CSS color syntax, we let the canvas 2D context (which understands the full CSS
// color grammar) resolve the value to sRGB pixels for us.
let cachedContext: CanvasRenderingContext2D | null | undefined;

const getProbeContext = (): CanvasRenderingContext2D | null => {
  if (cachedContext !== undefined) return cachedContext;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    cachedContext = canvas.getContext("2d", { willReadFrequently: true });
  } catch {
    cachedContext = null;
  }
  return cachedContext;
};

export const parseCssColor = (color: string): RgbaColor | null => {
  const trimmed = color.trim();
  if (!trimmed) return null;

  const context = getProbeContext();
  if (!context) return null;

  context.clearRect(0, 0, 1, 1);
  // An unparseable value leaves `fillStyle` at its previous value, so seeding a
  // transparent default means invalid colors stay fully transparent (alpha 0)
  // and are rejected by callers via the alpha channel.
  context.fillStyle = "rgba(0, 0, 0, 0)";
  context.fillStyle = trimmed;
  context.fillRect(0, 0, 1, 1);

  try {
    const { data } = context.getImageData(0, 0, 1, 1);
    return { red: data[0], green: data[1], blue: data[2], alpha: data[3] / 255 };
  } catch {
    return null;
  }
};

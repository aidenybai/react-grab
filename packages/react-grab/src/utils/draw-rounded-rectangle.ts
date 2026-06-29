export const drawRoundedRectangle = (
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  rectX: number,
  rectY: number,
  rectWidth: number,
  rectHeight: number,
  cornerRadius: number,
  fillColor: string,
  strokeColor: string,
  opacity: number = 1,
): void => {
  if (rectWidth <= 0 || rectHeight <= 0) return;

  const maxCornerRadius = Math.min(rectWidth / 2, rectHeight / 2);
  const clampedCornerRadius = Math.min(cornerRadius, maxCornerRadius);

  const shouldSetGlobalAlpha = opacity !== 1;
  if (shouldSetGlobalAlpha) context.globalAlpha = opacity;
  context.beginPath();
  if (clampedCornerRadius > 0) {
    context.roundRect(rectX, rectY, rectWidth, rectHeight, clampedCornerRadius);
  } else {
    context.rect(rectX, rectY, rectWidth, rectHeight);
  }
  context.fillStyle = fillColor;
  context.fill();
  context.strokeStyle = strokeColor;
  context.lineWidth = 1;
  context.stroke();
  if (shouldSetGlobalAlpha) context.globalAlpha = 1;
};

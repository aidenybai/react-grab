import { BORDER_RADIUS_SCALE_PRECISION_DECIMAL_PLACES } from "../constants.js";

const scalePixelValues = (pixelValues: string, scale: number): string =>
  pixelValues.replace(/([\d.]+)px/g, (_, radiusValue: string) => {
    const scaledRadius = Number(radiusValue) * Math.abs(scale);
    const roundedRadius = Number(
      scaledRadius.toFixed(BORDER_RADIUS_SCALE_PRECISION_DECIMAL_PLACES),
    );
    return `${roundedRadius}px`;
  });

export const scaleBorderRadius = (borderRadius: string, scaleX: number, scaleY: number): string => {
  const [horizontalRadius, verticalRadius] = borderRadius.split("/").map((value) => value.trim());
  const scaledHorizontalRadius = scalePixelValues(horizontalRadius, scaleX);
  const scaledVerticalRadius = scalePixelValues(verticalRadius ?? horizontalRadius, scaleY);

  if (verticalRadius === undefined && scaledHorizontalRadius === scaledVerticalRadius) {
    return scaledHorizontalRadius;
  }
  return `${scaledHorizontalRadius} / ${scaledVerticalRadius}`;
};

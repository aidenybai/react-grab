import { TRANSPARENT_BACKGROUND_COLOR } from "../constants";

export const findDocumentBackgroundColor = (contentDocument: Document): string | null => {
  const contentView = contentDocument.defaultView;
  const contentRoot = contentDocument.documentElement;
  if (!contentView || !contentRoot) return null;
  const rootBackground = contentView.getComputedStyle(contentRoot).backgroundColor;
  const bodyBackground = contentDocument.body
    ? contentView.getComputedStyle(contentDocument.body).backgroundColor
    : "";
  return (
    [rootBackground, bodyBackground].find(
      (backgroundColor) => backgroundColor && backgroundColor !== TRANSPARENT_BACKGROUND_COLOR,
    ) ?? null
  );
};

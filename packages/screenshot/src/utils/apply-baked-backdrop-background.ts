import { TRANSPARENT_BACKGROUND_COLOR } from "../constants";
import type { StyleDeclarationMap } from "../types";
import { splitTopLevelCommaList } from "./split-top-level-comma-list";

const BAKED_LAYER_VALUES: StyleDeclarationMap = {
  "background-size": "100% 100%",
  "background-position": "0% 0%",
  "background-repeat": "no-repeat",
  "background-origin": "border-box",
  "background-clip": "border-box",
  "background-attachment": "scroll",
  "background-blend-mode": "normal",
};

const LAYERED_BACKGROUND_PROP_DEFAULTS: StyleDeclarationMap = {
  "background-size": "auto",
  "background-position": "0% 0%",
  "background-repeat": "repeat",
  "background-origin": "padding-box",
  "background-clip": "border-box",
  "background-attachment": "scroll",
  "background-blend-mode": "normal",
};

// Replicates native paint order for a baked backdrop: the filtered backdrop
// crop goes below everything, the element's own background-color (normally
// painted beneath its background images) becomes a gradient layer above the
// baked crop, and any authored image layers stay on top.
export const applyBakedBackdropBackground = (
  diffed: StyleDeclarationMap,
  styles: StyleDeclarationMap,
  bakedPngDataUrl: string,
): void => {
  delete diffed["backdrop-filter"];
  const existingImageValue = styles["background-image"] ?? "none";
  const existingImageLayers =
    existingImageValue === "none"
      ? []
      : splitTopLevelCommaList(existingImageValue).map((layerValue) => layerValue.trim());
  const backgroundColorValue = styles["background-color"];
  const hasBackgroundColor =
    Boolean(backgroundColorValue) &&
    backgroundColorValue !== TRANSPARENT_BACKGROUND_COLOR &&
    backgroundColorValue !== "transparent";
  const imageLayers = [...existingImageLayers];
  if (hasBackgroundColor) {
    imageLayers.push(`linear-gradient(${backgroundColorValue}, ${backgroundColorValue})`);
  }
  imageLayers.push(`url("${bakedPngDataUrl}")`);
  diffed["background-image"] = imageLayers.join(", ");
  diffed["background-color"] = "transparent";
  for (const propertyName in LAYERED_BACKGROUND_PROP_DEFAULTS) {
    const fallbackValue = LAYERED_BACKGROUND_PROP_DEFAULTS[propertyName];
    const authoredValue = styles[propertyName];
    const authoredParts = authoredValue
      ? splitTopLevelCommaList(authoredValue).map((layerValue) => layerValue.trim())
      : [fallbackValue];
    const layerParts = existingImageLayers.map(
      (_, layerIndex) => authoredParts[layerIndex % authoredParts.length] ?? fallbackValue,
    );
    if (hasBackgroundColor) {
      // background-color is clipped by the last layer's background-clip.
      layerParts.push(
        propertyName === "background-clip"
          ? (authoredParts[authoredParts.length - 1] ?? fallbackValue)
          : BAKED_LAYER_VALUES[propertyName],
      );
    }
    layerParts.push(BAKED_LAYER_VALUES[propertyName]);
    diffed[propertyName] = layerParts.join(", ");
  }
};

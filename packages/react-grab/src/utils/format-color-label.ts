import { EDIT_TRANSPARENT_COLOR_HEX, EDIT_TRANSPARENT_COLOR_LABEL } from "../constants.js";

export const formatColorLabel = (colorValue: string): string =>
  colorValue.toLowerCase() === EDIT_TRANSPARENT_COLOR_HEX
    ? EDIT_TRANSPARENT_COLOR_LABEL
    : colorValue.toUpperCase();

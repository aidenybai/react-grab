import type { LabelBoundsSource } from "../types.js";
import { isElementConnected } from "./is-element-connected.js";

export const hasLiveSource = (source: LabelBoundsSource): boolean =>
  source.elements.some(isElementConnected);

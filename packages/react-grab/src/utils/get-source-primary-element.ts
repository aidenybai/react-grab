import type { LabelBoundsSource } from "../types.js";
import { isElementConnected } from "./is-element-connected.js";

export const getSourcePrimaryElement = (source: LabelBoundsSource): Element | null =>
  source.elements.find(isElementConnected) ?? source.elements[0] ?? null;

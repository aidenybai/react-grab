import { HIT_TEST_SHIELD_ATTRIBUTE } from "../constants.js";
import { isReactGrabHost } from "./is-react-grab-host.js";
import { isShadowRoot } from "./is-shadow-root.js";

export const isReactGrabElement = (element: Element): boolean => {
  if (isReactGrabHost(element)) return true;
  if (element.hasAttribute(HIT_TEST_SHIELD_ATTRIBUTE)) return true;

  const rootNode = element.getRootNode();
  return isShadowRoot(rootNode) && isReactGrabHost(rootNode.host);
};

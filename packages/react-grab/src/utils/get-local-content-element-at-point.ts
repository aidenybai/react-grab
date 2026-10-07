import { convertTopWindowPositionToClient } from "./convert-top-window-position-to-client.js";
import { getElementComputedStyle } from "./get-element-computed-style.js";
import { isElementNode } from "./is-element-node.js";
import { isRootElement } from "./is-root-element.js";
import { isShadowRoot } from "./is-shadow-root.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

const getNearestSvgRoot = (element: Element): Element => {
  if (element.localName === "svg") return element;
  let svgRoot = element;
  let parentElement = element.parentElement;
  while (parentElement?.namespaceURI === SVG_NAMESPACE) {
    svgRoot = parentElement;
    if (parentElement.localName === "svg") break;
    parentElement = parentElement.parentElement;
  }
  return svgRoot;
};

const getCaretNode = (
  targetDocument: Document,
  clientX: number,
  clientY: number,
  shadowRoot: ShadowRoot | null,
): Node | null => {
  if (typeof targetDocument.caretPositionFromPoint === "function") {
    const caretPosition = targetDocument.caretPositionFromPoint(clientX, clientY, {
      shadowRoots: shadowRoot ? [shadowRoot] : [],
    });
    if (caretPosition) return caretPosition.offsetNode;
  }
  return typeof targetDocument.caretRangeFromPoint === "function"
    ? (targetDocument.caretRangeFromPoint(clientX, clientY)?.startContainer ?? null)
    : null;
};

export const getLocalContentElementAtPoint = (
  hitElement: Element,
  clientX: number,
  clientY: number,
): Element | null => {
  if (isRootElement(hitElement)) return null;

  const targetDocument = hitElement.ownerDocument;
  const ownerWindow = targetDocument.defaultView;
  if (!ownerWindow) return null;

  const localPosition = convertTopWindowPositionToClient(ownerWindow, clientX, clientY);
  const hitRoot = hitElement.getRootNode();
  const caretNode = getCaretNode(
    targetDocument,
    localPosition.x,
    localPosition.y,
    isShadowRoot(hitRoot) ? hitRoot : null,
  );
  if (!caretNode) return null;

  const contentElement = isElementNode(caretNode) ? caretNode : caretNode.parentElement;
  if (!contentElement || contentElement === hitElement) return null;

  const isSvgHit = hitElement.namespaceURI === SVG_NAMESPACE;
  const localRoot = isSvgHit ? getNearestSvgRoot(hitElement) : hitElement;
  if (!localRoot.contains(contentElement)) return null;
  if (!isSvgHit && getElementComputedStyle(contentElement).pointerEvents !== "none") return null;
  return contentElement;
};

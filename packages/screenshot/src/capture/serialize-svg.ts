import { SVG_NAMESPACE_URI, XHTML_NAMESPACE_URI } from "../constants";
import type { SerializeSvgInput } from "../types";
import { stripInvalidXmlCharacters } from "../utils/strip-invalid-xml-characters";

const NORMALIZATION_CSS =
  "*{scrollbar-width:none}" +
  "\n*::-webkit-scrollbar{display:none}" +
  // iOS WebKit re-applies text-size-adjust while rasterizing foreignObject content,
  // inflating font sizes unless pinned via a rule (an inline style is expanded too late).
  "\nforeignObject>div{-webkit-text-size-adjust:100%!important}";

export const serializeToSvgMarkup = ({
  clone,
  cssText,
  width,
  height,
  ownerDocument,
}: SerializeSvgInput): string => {
  const svgElement = ownerDocument.createElementNS(SVG_NAMESPACE_URI, "svg");
  svgElement.setAttribute("width", String(width));
  svgElement.setAttribute("height", String(height));
  svgElement.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const styleElement = ownerDocument.createElementNS(SVG_NAMESPACE_URI, "style");
  styleElement.textContent = `${NORMALIZATION_CSS}\n${cssText}`;
  const foreignObjectElement = ownerDocument.createElementNS(SVG_NAMESPACE_URI, "foreignObject");
  foreignObjectElement.setAttribute("width", "100%");
  foreignObjectElement.setAttribute("height", "100%");
  const wrapperElement = ownerDocument.createElementNS(XHTML_NAMESPACE_URI, "div");
  wrapperElement.setAttribute(
    "style",
    `all:initial;box-sizing:border-box;display:block;overflow:visible;width:${width}px;height:${height}px;`,
  );
  wrapperElement.appendChild(clone);
  foreignObjectElement.appendChild(wrapperElement);
  svgElement.appendChild(styleElement);
  svgElement.appendChild(foreignObjectElement);
  return stripInvalidXmlCharacters(new XMLSerializer().serializeToString(svgElement));
};

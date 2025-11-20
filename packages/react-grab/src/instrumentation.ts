import {
  _fiberRoots as fiberRoots,
  instrument,
} from "bippy";
import {
  getSourceFromHostInstance,
  isSourceFile,
  normalizeFileName,
} from "bippy/dist/source";
import { finder } from "@medv/finder";
import { getNearestComponentName } from "./utils/get-nearest-component-name.js";

instrument({
  onCommitFiberRoot(_, fiberRoot) {
    fiberRoots.add(fiberRoot);
  },
});

const generateCSSSelector = (element: Element) => {
  return finder(element);
};

const truncateString = (string: string, maxLength: number) =>
  string.length > maxLength ? `${string.substring(0, maxLength)}...` : string;

const formatComponentSourceLocation = async (
  el: Element,
): Promise<string | null> => {
  const source = await getSourceFromHostInstance(el);
  if (!source) return null;
  const fileName = normalizeFileName(source.fileName);

  if (isSourceFile(fileName)) {
    return `${fileName}:${source.lineNumber}:${source.columnNumber}`;
  }

  if (
    fileName &&
    (fileName.includes(".tsx") ||
    fileName.includes(".ts") ||
    fileName.includes(".jsx") ||
    fileName.includes(".js"))
  ) {
    const cleanedFileName = fileName
      .replace(/^webpack:\/\/_N_E\//, "")
      .replace(/^webpack:\/\/\//, "")
      .replace(/^webpack:\/\//, "")
      .replace(/^\.\//, "");

    if (
      cleanedFileName &&
      !cleanedFileName.startsWith("node_modules") &&
      !cleanedFileName.includes(".next") &&
      !cleanedFileName.startsWith("webpack")
    ) {
      return `${cleanedFileName}:${source.lineNumber}:${source.columnNumber}`;
    }
  }

  return null;
};

export const getHTMLSnippet = async (element: Element) => {
  const semanticTags = new Set([
    "article",
    "aside",
    "footer",
    "form",
    "header",
    "main",
    "nav",
    "section",
  ]);

  const hasDistinguishingFeatures = (el: Element): boolean => {
    const tagName = el.tagName.toLowerCase();
    if (semanticTags.has(tagName)) return true;
    if (el.id) return true;
    if (el.className && typeof el.className === "string") {
      const classes = el.className.trim();
      if (classes && classes.length > 0) return true;
    }
    return Array.from(el.attributes).some((attr) =>
      attr.name.startsWith("data-"),
    );
  };

  const collectDistinguishingAncestors = (
    el: Element,
    maxDepth: number = 10,
  ): Element[] => {
    const ancestors: Element[] = [];
    let current = el.parentElement;
    let depth = 0;

    while (current && depth < maxDepth && current.tagName !== "BODY") {
      if (hasDistinguishingFeatures(current)) {
        ancestors.push(current);
        if (ancestors.length >= 3) break;
      }
      current = current.parentElement;
      depth++;
    }

    return ancestors.reverse();
  };

  const formatElementOpeningTag = (
    el: Element,
    compact: boolean = false,
  ): string => {
    const tagName = el.tagName.toLowerCase();
    const attrs: string[] = [];

    if (el.id) {
      attrs.push(`id="${el.id}"`);
    }

    if (el.className && typeof el.className === "string") {
      const classes = el.className.trim().split(/\s+/);
      if (classes.length > 0 && classes[0]) {
        const displayClasses = compact ? classes.slice(0, 3) : classes;
        const classStr = truncateString(displayClasses.join(" "), 30);
        attrs.push(`class="${classStr}"`);
      }
    }

    const dataAttrs = Array.from(el.attributes).filter((attr) =>
      attr.name.startsWith("data-"),
    );
    const displayDataAttrs = compact ? dataAttrs.slice(0, 1) : dataAttrs;
    for (const attr of displayDataAttrs) {
      attrs.push(`${attr.name}="${truncateString(attr.value, 20)}"`);
    }

    const ariaLabel = el.getAttribute("aria-label");
    if (ariaLabel && !compact) {
      attrs.push(`aria-label="${truncateString(ariaLabel, 20)}"`);
    }

    return attrs.length > 0
      ? `<${tagName} ${attrs.join(" ")}>`
      : `<${tagName}>`;
  };

  const formatElementClosingTag = (el: Element) =>
    `</${el.tagName.toLowerCase()}>`;

  const extractTruncatedTextContent = (el: Element) => {
    const text = (el.textContent || "").trim().replace(/\s+/g, " ");
    return truncateString(text, 60);
  };

  const extractSiblingIdentifier = (el: Element): null | string => {
    if (el.id) return `#${el.id}`;
    if (el.className && typeof el.className === "string") {
      const classes = el.className.trim().split(/\s+/);
      if (classes.length > 0 && classes[0]) {
        return `.${classes[0]}`;
      }
    }
    return null;
  };

  const lines: string[] = [];

  const selector = generateCSSSelector(element);
  lines.push(`- selector: ${selector}`);
  const rect = element.getBoundingClientRect();
  lines.push(`- width: ${Math.round(rect.width)}`);
  lines.push(`- height: ${Math.round(rect.height)}`);
  lines.push("HTML snippet:");
  lines.push("```html");

  const ancestors = collectDistinguishingAncestors(element);

  const ancestorComponents = ancestors.map((ancestor) =>
    getNearestComponentName(ancestor),
  );
  const elementComponent = getNearestComponentName(element);

  const ancestorSources = await Promise.all(
    ancestors.map((ancestor) => formatComponentSourceLocation(ancestor)),
  );
  const elementSource = await formatComponentSourceLocation(element);

  const ancestorElementIndents: number[] = [];
  const ancestorComponentIndents: number[] = [];
  let currentIndentLevel = 0;

  const getIndent = (level: number) => "  ".repeat(level);

  for (let i = 0; i < ancestors.length; i++) {
    const componentName = ancestorComponents[i];
    const source = ancestorSources[i];
    const isNewComponent =
      componentName &&
      source &&
      (i === 0 || ancestorComponents[i - 1] !== componentName);

    if (isNewComponent) {
      ancestorComponentIndents[i] = currentIndentLevel;
      lines.push(
        `${getIndent(currentIndentLevel)}<${componentName} used-at="${source}">`,
      );
      currentIndentLevel++;
    }

    ancestorElementIndents[i] = currentIndentLevel;
    lines.push(
      `${getIndent(currentIndentLevel)}${formatElementOpeningTag(ancestors[i], true)}`,
    );
    currentIndentLevel++;
  }

  const parent = element.parentElement;
  let targetIndex = -1;
  if (parent) {
    const siblings = Array.from(parent.children);
    targetIndex = siblings.indexOf(element);

    if (targetIndex > 0) {
      const indent = getIndent(currentIndentLevel);

      if (targetIndex <= 2) {
        for (let i = 0; i < targetIndex; i++) {
          const sibling = siblings[i];
          const siblingId = extractSiblingIdentifier(sibling);
          if (siblingId) {
            lines.push(`${indent}${formatElementOpeningTag(sibling, true)}`);
            lines.push(`${indent}</${sibling.tagName.toLowerCase()}>`);
          }
        }
      } else {
        lines.push(
          `${indent}... (${targetIndex} element${
            targetIndex === 1 ? "" : "s"
          })`,
        );
      }
    }
  }

  const lastAncestorComponent =
    ancestors.length > 0
      ? ancestorComponents[ancestorComponents.length - 1]
      : null;
  const showElementComponent =
    elementComponent &&
    elementSource &&
    elementComponent !== lastAncestorComponent;

  let elementIndentLevel = currentIndentLevel;
  const elementComponentIndentLevel = currentIndentLevel;

  if (showElementComponent) {
    lines.push(
      `${getIndent(elementIndentLevel)}<${elementComponent} used-at="${elementSource}">`,
    );
    elementIndentLevel++;
  }

  const elementIndent = getIndent(elementIndentLevel);
  lines.push(`${elementIndent}<!-- IMPORTANT: selected element -->`);

  const textContent = extractTruncatedTextContent(element);
  const childrenCount = element.children.length;

  if (textContent && childrenCount === 0 && textContent.length < 40) {
    lines.push(
      `${elementIndent}${formatElementOpeningTag(element)}${textContent}${formatElementClosingTag(
        element,
      )}`,
    );
  } else {
    lines.push(`${elementIndent}${formatElementOpeningTag(element)}`);
    if (textContent) {
      lines.push(`${elementIndent}  ${textContent}`);
    }
    if (childrenCount > 0) {
      lines.push(
        `${elementIndent}  ... (${childrenCount} element${
          childrenCount === 1 ? "" : "s"
        })`,
      );
    }
    lines.push(`${elementIndent}${formatElementClosingTag(element)}`);
  }

  if (showElementComponent) {
    lines.push(
      `${getIndent(elementComponentIndentLevel)}</${elementComponent}>`,
    );
  }

  if (parent && targetIndex >= 0) {
    const siblings = Array.from(parent.children);
    const siblingsAfter = siblings.length - targetIndex - 1;
    if (siblingsAfter > 0) {
      const indent = getIndent(currentIndentLevel);
      if (siblingsAfter <= 2) {
        for (let i = targetIndex + 1; i < siblings.length; i++) {
          const sibling = siblings[i];
          const siblingId = extractSiblingIdentifier(sibling);
          if (siblingId) {
            lines.push(`${indent}${formatElementOpeningTag(sibling, true)}`);
            lines.push(`${indent}</${sibling.tagName.toLowerCase()}>`);
          }
        }
      } else {
        lines.push(
          `${indent}... (${siblingsAfter} element${
            siblingsAfter === 1 ? "" : "s"
          })`,
        );
      }
    }
  }

  for (let i = ancestors.length - 1; i >= 0; i--) {
    const elementIndent = getIndent(ancestorElementIndents[i]);
    lines.push(`${elementIndent}${formatElementClosingTag(ancestors[i])}`);

    if (ancestorComponentIndents[i] !== undefined) {
      const compIndent = getIndent(ancestorComponentIndents[i]);
      lines.push(`${compIndent}</${ancestorComponents[i]}>`);
    }
  }

  lines.push("```");

  return lines.join("\n");
};

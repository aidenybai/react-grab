import {
  _fiberRoots as fiberRoots,
  getFiberFromHostInstance,
  getDisplayName,
  instrument,
  isCompositeFiber,
  traverseFiber,
} from "bippy";
import {
  getSourceFromHostInstance,
  isSourceFile,
  normalizeFileName,
} from "bippy/dist/source";
import { finder } from "@medv/finder";

instrument({
  onCommitFiberRoot(_, fiberRoot) {
    fiberRoots.add(fiberRoot);
  },
});

const generateCSSSelector = (element: Element) => {
  return finder(element);
};

export const getHTMLSnippet = async (element: Element) => {
  const truncateString = (string: string, maxLength: number) =>
    string.length > maxLength
      ? `${string.substring(0, maxLength)}...`
      : string;

  const isInternalComponent = (name: string): boolean => {
    if (name.startsWith("_")) return true;
    if (name.includes("Provider") && name.includes("Context")) return true;

    return false;
  };

  const extractReactComponentName = (el: Element): string | null => {
    const fiber = getFiberFromHostInstance(el);
    if (!fiber) return null;

    let componentName: string | null = null;
    traverseFiber(
      fiber,
      (currentFiber) => {
        if (isCompositeFiber(currentFiber)) {
          const displayName = getDisplayName(currentFiber);
          if (displayName && !isInternalComponent(displayName)) {
            componentName = displayName;
            return true;
          }
        }
        return false;
      },
      true,
    );

    return componentName;
  };

  const formatComponentSourceLocation = async (
    el: Element,
  ): Promise<string | null> => {
    const source = await getSourceFromHostInstance(el);
    if (!source) return null;
    const fileName = normalizeFileName(source.fileName);
    if (!isSourceFile(fileName)) return null;
    return `${fileName}:${source.lineNumber}:${source.columnNumber}`;
  };

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
  lines.push(`Locate this element in the codebase:`);
  lines.push(`- selector: ${selector}`);
  const rect = element.getBoundingClientRect();
  lines.push(`- width: ${Math.round(rect.width)}`);
  lines.push(`- height: ${Math.round(rect.height)}`);
  lines.push("HTML snippet:");
  lines.push("```html");

  const ancestors = collectDistinguishingAncestors(element);

  const ancestorComponents = ancestors.map((ancestor) =>
    extractReactComponentName(ancestor),
  );
  const elementComponent = extractReactComponentName(element);

  const ancestorSources = await Promise.all(
    ancestors.map((ancestor) => formatComponentSourceLocation(ancestor)),
  );
  const elementSource = await formatComponentSourceLocation(element);

  for (let i = 0; i < ancestors.length; i++) {
    const indent = "  ".repeat(i);
    const componentName = ancestorComponents[i];
    const source = ancestorSources[i];
    if (
      componentName &&
      source &&
      (i === 0 || ancestorComponents[i - 1] !== componentName)
    ) {
      lines.push(`${indent}<${componentName} source="${source}">`);
    }
    lines.push(`${indent}${formatElementOpeningTag(ancestors[i], true)}`);
  }

  const parent = element.parentElement;
  let targetIndex = -1;
  if (parent) {
    const siblings = Array.from(parent.children);
    targetIndex = siblings.indexOf(element);

    if (targetIndex > 0) {
      const prevSibling = siblings[targetIndex - 1];
      const prevId = extractSiblingIdentifier(prevSibling);
      if (prevId && targetIndex <= 2) {
        const indent = "  ".repeat(ancestors.length);
        lines.push(`${indent}  ${formatElementOpeningTag(prevSibling, true)}`);
        lines.push(`${indent}  </${prevSibling.tagName.toLowerCase()}>`);
      } else if (targetIndex > 0) {
        const indent = "  ".repeat(ancestors.length);
        lines.push(
          `${indent}  ... (${targetIndex} element${
            targetIndex === 1 ? "" : "s"
          })`,
        );
      }
    }
  }

  const indent = "  ".repeat(ancestors.length);

  const lastAncestorComponent =
    ancestors.length > 0
      ? ancestorComponents[ancestorComponents.length - 1]
      : null;
  const showElementComponent =
    elementComponent &&
    elementSource &&
    elementComponent !== lastAncestorComponent;

  if (showElementComponent) {
    lines.push(`${indent}  <${elementComponent} used-at="${elementSource}">`);
  }

  lines.push(`${indent}  <!-- IMPORTANT: selected element -->`);

  const textContent = extractTruncatedTextContent(element);
  const childrenCount = element.children.length;

  const elementIndent = `${indent}${showElementComponent ? "    " : "  "}`;

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
    lines.push(`${indent}  </${elementComponent}>`);
  }

  if (parent && targetIndex >= 0) {
    const siblings = Array.from(parent.children);
    const siblingsAfter = siblings.length - targetIndex - 1;
    if (siblingsAfter > 0) {
      const nextSibling = siblings[targetIndex + 1];
      const nextId = extractSiblingIdentifier(nextSibling);
      if (nextId && siblingsAfter <= 2) {
        lines.push(`${indent}  ${formatElementOpeningTag(nextSibling, true)}`);
        lines.push(`${indent}  </${nextSibling.tagName.toLowerCase()}>`);
      } else {
        lines.push(
          `${indent}  ... (${siblingsAfter} element${
            siblingsAfter === 1 ? "" : "s"
          })`,
        );
      }
    }
  }

  for (let i = ancestors.length - 1; i >= 0; i--) {
    const indent = "  ".repeat(i);
    lines.push(`${indent}${formatElementClosingTag(ancestors[i])}`);
    const componentName = ancestorComponents[i];
    const source = ancestorSources[i];
    if (
      componentName &&
      source &&
      (i === ancestors.length - 1 ||
        ancestorComponents[i + 1] !== componentName)
    ) {
      lines.push(`${indent}</${componentName}>`);
    }
  }

  lines.push("```");

  return lines.join("\n");
};

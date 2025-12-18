import morphdom from "morphdom";

const ANCESTOR_LEVELS = 5;

export interface ApplyResult {
  success: boolean;
  executionResult: string | null;
  error?: string;
  modifiedClone: HTMLElement;
}

export const executeCodeOnClone = (
  element: HTMLElement,
  sanitizedCode: string,
): ApplyResult => {
  const clonedElement = element.cloneNode(true) as HTMLElement;

  try {
    const returnValue = new Function("$el", sanitizedCode).bind(null)(
      clonedElement,
    );
    const executionResult =
      returnValue !== undefined ? String(returnValue) : null;
    return {
      success: true,
      executionResult,
      modifiedClone: clonedElement,
    };
  } catch (executionError) {
    const errorMessage =
      executionError instanceof Error
        ? executionError.message
        : "Execution failed";
    return {
      success: false,
      executionResult: null,
      error: errorMessage,
      modifiedClone: clonedElement,
    };
  }
};

export const applyCloneToElement = (
  targetElement: HTMLElement,
  modifiedClone: HTMLElement,
): void => {
  morphdom(targetElement, modifiedClone, { childrenOnly: false });
};

export const createUndoFunction = (
  targetElement: HTMLElement,
  originalOuterHtml: string,
): (() => void) => {
  return () => {
    const temporaryContainer = document.createElement("div");
    temporaryContainer.innerHTML = originalOuterHtml;
    const restoredElement = temporaryContainer.firstElementChild as HTMLElement;
    morphdom(targetElement, restoredElement, { childrenOnly: false });
  };
};

const getOpeningTag = (element: Element): string => {
  const shallowClone = element.cloneNode(false) as Element;
  const temporaryWrapper = document.createElement("div");
  temporaryWrapper.appendChild(shallowClone);
  const serializedHtml = temporaryWrapper.innerHTML;
  const closingTagMatch = serializedHtml.match(/<\/[^>]+>$/);
  if (closingTagMatch) {
    return serializedHtml.slice(0, -closingTagMatch[0].length);
  }
  return serializedHtml;
};

const getClosingTag = (element: Element): string => {
  return `</${element.tagName.toLowerCase()}>`;
};

export const buildAncestorContext = (element: Element): string => {
  const ancestors: Element[] = [];
  let currentAncestor = element.parentElement;

  for (
    let level = 0;
    level < ANCESTOR_LEVELS && currentAncestor;
    level++
  ) {
    if (
      currentAncestor === document.body ||
      currentAncestor === document.documentElement
    ) {
      break;
    }
    ancestors.push(currentAncestor);
    currentAncestor = currentAncestor.parentElement;
  }

  if (ancestors.length === 0) {
    return element.outerHTML;
  }

  ancestors.reverse();

  let result = "";
  let indentation = "";

  for (const ancestor of ancestors) {
    result += `${indentation}${getOpeningTag(ancestor)}\n`;
    indentation += "  ";
  }

  result += `${indentation}<!-- START $el -->\n`;
  const targetElementLines = element.outerHTML.split("\n");
  for (const line of targetElementLines) {
    result += `${indentation}${line}\n`;
  }
  result += `${indentation}<!-- END $el -->\n`;

  for (
    let ancestorIndex = ancestors.length - 1;
    ancestorIndex >= 0;
    ancestorIndex--
  ) {
    indentation = "  ".repeat(ancestorIndex);
    result += `${indentation}${getClosingTag(ancestors[ancestorIndex])}\n`;
  }

  return result.trim();
};

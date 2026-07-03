import { PSEUDO_PREFLIGHT_RULE_BUDGET } from "../constants";
import type { PseudoRulePreflight, StyleDeclarationMap } from "../types";
import { isCssStyleRule } from "../utils/is-css-style-rule";
import { snapshotComputedStyle } from "../utils/snapshot-computed-style";
import { visitDocumentCssRules } from "../utils/visit-document-css-rules";

export const preflightPseudoRules = (sourceDocument: Document): PseudoRulePreflight => {
  let scannedRuleCount = 0;
  const preflight: PseudoRulePreflight = {
    definesBeforeAfter: false,
    definesFirstLetter: false,
    definesMarker: false,
  };
  const assumeAllPseudoRules = (): boolean => {
    preflight.definesBeforeAfter = true;
    preflight.definesFirstLetter = true;
    preflight.definesMarker = true;
    return true;
  };
  visitDocumentCssRules(
    sourceDocument,
    (rule) => {
      scannedRuleCount++;
      if (scannedRuleCount > PSEUDO_PREFLIGHT_RULE_BUDGET) return assumeAllPseudoRules();
      if (isCssStyleRule(rule)) {
        const selectorText = rule.selectorText;
        if (selectorText.includes(":before") || selectorText.includes(":after")) {
          preflight.definesBeforeAfter = true;
        }
        if (selectorText.includes(":first-letter")) {
          preflight.definesFirstLetter = true;
        }
        if (selectorText.includes(":marker")) {
          preflight.definesMarker = true;
        }
      }
      return (
        preflight.definesBeforeAfter && preflight.definesFirstLetter && preflight.definesMarker
      );
    },
    assumeAllPseudoRules,
  );
  return preflight;
};

export const snapshotPseudoStyles = (
  element: Element,
  pseudoSelector: string,
  defaultView: Window & typeof globalThis,
  relevantPropertyNames: readonly string[] | null,
): StyleDeclarationMap | null => {
  const computedStyle = defaultView.getComputedStyle(element, pseudoSelector);
  const contentValue = computedStyle.getPropertyValue("content");
  if (contentValue === "" || contentValue === "none" || contentValue === "normal") return null;
  const styles = snapshotComputedStyle(computedStyle, relevantPropertyNames);
  styles.content = contentValue;
  return styles;
};

// Used when no stylesheet sets content via attr()/counter(), so pseudo
// presence and content are identical across elements with the same memo key
// and only layout-dependent props need re-reading.
export const snapshotTrustedMemoizedPseudoStyles = (
  element: Element,
  pseudoSelector: string,
  defaultView: Window & typeof globalThis,
  perElementPropertyNames: readonly string[],
  memoizedStyles: StyleDeclarationMap | null,
): StyleDeclarationMap | null => {
  if (!memoizedStyles) return null;
  const computedStyle = defaultView.getComputedStyle(element, pseudoSelector);
  const styles: StyleDeclarationMap = { ...memoizedStyles };
  for (const propertyName of perElementPropertyNames) {
    const propertyValue = computedStyle.getPropertyValue(propertyName);
    if (propertyValue !== "") styles[propertyName] = propertyValue;
    else delete styles[propertyName];
  }
  return styles;
};

// The content value is re-read per element because attr()/counter() usage can
// resolve differently for elements that match identical rules; a mismatch with
// the memoized presence falls back to a full read.
export const snapshotMemoizedPseudoStyles = (
  element: Element,
  pseudoSelector: string,
  defaultView: Window & typeof globalThis,
  relevantPropertyNames: readonly string[] | null,
  perElementPropertyNames: readonly string[],
  memoizedStyles: StyleDeclarationMap | null,
): StyleDeclarationMap | null => {
  const computedStyle = defaultView.getComputedStyle(element, pseudoSelector);
  const contentValue = computedStyle.getPropertyValue("content");
  if (contentValue === "" || contentValue === "none" || contentValue === "normal") return null;
  if (!memoizedStyles) {
    const styles = snapshotComputedStyle(computedStyle, relevantPropertyNames);
    styles.content = contentValue;
    return styles;
  }
  const styles: StyleDeclarationMap = { ...memoizedStyles };
  for (const propertyName of perElementPropertyNames) {
    const propertyValue = computedStyle.getPropertyValue(propertyName);
    if (propertyValue !== "") styles[propertyName] = propertyValue;
    else delete styles[propertyName];
  }
  styles.content = contentValue;
  return styles;
};

export const snapshotFirstLetterStyles = (
  element: Element,
  defaultView: Window & typeof globalThis,
): StyleDeclarationMap | null => {
  if (!element.firstChild) return null;
  return snapshotComputedStyle(defaultView.getComputedStyle(element, "::first-letter"));
};

export const snapshotMarkerStyles = (
  element: Element,
  defaultView: Window & typeof globalThis,
): StyleDeclarationMap => {
  const computedStyle = defaultView.getComputedStyle(element, "::marker");
  const styles = snapshotComputedStyle(computedStyle);
  const contentValue = computedStyle.getPropertyValue("content");
  if (contentValue) styles.content = contentValue;
  return styles;
};

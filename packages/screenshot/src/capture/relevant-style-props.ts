import {
  ALWAYS_SNAPSHOT_STYLE_PROPS,
  PER_ELEMENT_SNAPSHOT_STYLE_PROPS,
  WAAPI_KEYFRAME_META_KEYS,
} from "../constants";
import type { RelevantStylePropRegistry } from "../types";
import { isCssGroupingRule } from "../utils/is-css-grouping-rule";
import { isCssImportRule } from "../utils/is-css-import-rule";
import { isCssKeyframesRule } from "../utils/is-css-keyframes-rule";
import { isCssStyleRule } from "../utils/is-css-style-rule";
import { isElementScopedGroupingRule } from "../utils/is-element-scoped-grouping-rule";
import { isMemoSafeSelector } from "../utils/is-memo-safe-selector";
import { shouldSkipStyleProp } from "../utils/should-skip-style-prop";
import { visitDocumentCssRules } from "../utils/visit-document-css-rules";
import { waapiKeyframePropToCssProp } from "../utils/waapi-keyframe-prop-to-css-prop";

// Enumerates every property name that author CSS, WAAPI animations, or (added
// incrementally during the tree walk) inline styles and shadow-root
// stylesheets could set. Properties outside this set can only hold the
// sandbox-baseline value for regular HTML elements, so the computed-style
// snapshot skips reading them. Returns null when a stylesheet is
// cross-origin-inaccessible, since its rules could set anything; callers then
// fall back to full snapshots.
export const createRelevantStylePropRegistry = (
  sourceDocument: Document,
): RelevantStylePropRegistry | null => {
  const seenProps = new Set<string>();
  const propertyNames: string[] = [];
  let isMemoSafe = true;
  let isPseudoContentMemoSafe = true;
  const addProp = (propertyName: string): void => {
    if (seenProps.has(propertyName)) return;
    seenProps.add(propertyName);
    if (shouldSkipStyleProp(propertyName)) return;
    propertyNames.push(propertyName);
  };

  const addDeclarationProps = (declaration: CSSStyleDeclaration): void => {
    for (let propertyIndex = 0; propertyIndex < declaration.length; propertyIndex++) {
      const propertyName = declaration.item(propertyIndex);
      if (
        isMemoSafe &&
        (propertyName === "animation-name" || propertyName === "transition-property") &&
        declaration.getPropertyValue(propertyName) !== "none"
      ) {
        isMemoSafe = false;
      }
      if (isPseudoContentMemoSafe && propertyName === "content") {
        const contentValue = declaration.getPropertyValue("content");
        if (contentValue.includes("attr(") || contentValue.includes("counter")) {
          isPseudoContentMemoSafe = false;
        }
      }
      addProp(propertyName);
    }
  };

  const addRuleProps = (rule: CSSRule): void => {
    if (isCssStyleRule(rule)) {
      if (isMemoSafe && !isMemoSafeSelector(rule.selectorText)) isMemoSafe = false;
      addDeclarationProps(rule.style);
    } else if (isCssKeyframesRule(rule)) {
      for (const keyframeRule of rule.cssRules) {
        if (keyframeRule instanceof CSSKeyframeRule) addDeclarationProps(keyframeRule.style);
      }
    } else if (isCssGroupingRule(rule) && isElementScopedGroupingRule(rule)) {
      isMemoSafe = false;
    }
  };

  const addWaapiAnimationProps = (): void => {
    if (typeof sourceDocument.getAnimations !== "function") return;
    for (const animation of sourceDocument.getAnimations()) {
      isMemoSafe = false;
      const animationEffect = animation.effect;
      if (!(animationEffect instanceof KeyframeEffect)) continue;
      for (const keyframe of animationEffect.getKeyframes()) {
        for (const keyframeProp in keyframe) {
          if (WAAPI_KEYFRAME_META_KEYS.has(keyframeProp)) continue;
          addProp(waapiKeyframePropToCssProp(keyframeProp));
        }
      }
    }
  };

  for (const alwaysProp of ALWAYS_SNAPSHOT_STYLE_PROPS) addProp(alwaysProp);
  let hasInaccessibleSheet = false;
  visitDocumentCssRules(
    sourceDocument,
    (rule) => {
      addRuleProps(rule);
      return false;
    },
    () => {
      hasInaccessibleSheet = true;
      return true;
    },
  );
  if (hasInaccessibleSheet) return null;
  addWaapiAnimationProps();
  const perElementPropertyNames = PER_ELEMENT_SNAPSHOT_STYLE_PROPS.filter((propertyName) =>
    seenProps.has(propertyName),
  );

  const addInlineStyleProps = (inlineStyle: CSSStyleDeclaration): void => {
    addDeclarationProps(inlineStyle);
  };

  const addRuleListProps = (rules: CSSRuleList): void => {
    for (const rule of rules) {
      addRuleProps(rule);
      if (isCssImportRule(rule)) {
        const importedSheet = rule.styleSheet;
        if (importedSheet) addRuleListProps(importedSheet.cssRules);
      } else if (isCssGroupingRule(rule)) {
        addRuleListProps(rule.cssRules);
      }
    }
  };

  const addShadowRootStyleProps = (shadowRoot: ShadowRoot): boolean => {
    for (const styleSheet of [...shadowRoot.styleSheets, ...shadowRoot.adoptedStyleSheets]) {
      try {
        addRuleListProps(styleSheet.cssRules);
      } catch {
        return false;
      }
    }
    return true;
  };

  return {
    propertyNames,
    perElementPropertyNames,
    isStyleMemoSafe: () => isMemoSafe,
    isPseudoContentMemoSafe: () => isPseudoContentMemoSafe,
    addInlineStyleProps,
    addShadowRootStyleProps,
  };
};

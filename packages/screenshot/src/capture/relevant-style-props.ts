import {
  ALWAYS_SNAPSHOT_STYLE_PROPS,
  ALWAYS_STYLE_RELEVANT_ATTRIBUTE_NAMES,
  ATTRIBUTE_SELECTOR_NAME_PATTERN,
  CLASS_STABLE_CANDIDATE_STYLE_PROPS,
  INSET_STYLE_PROPS,
  PER_ELEMENT_SNAPSHOT_STYLE_PROPS,
  BOX_RELATIVE_VALUE_PATTERN,
  STABLE_DECLARED_VALUE_PATTERN,
  WAAPI_KEYFRAME_META_KEYS,
} from "../constants";
import type { RelevantStylePropRegistry } from "../types";
import { isCssGroupingRule } from "../utils/is-css-grouping-rule";
import { isCssImportRule } from "../utils/is-css-import-rule";
import { isCssKeyframesRule } from "../utils/is-css-keyframes-rule";
import { isCssStyleRule } from "../utils/is-css-style-rule";
import { isElementScopedGroupingRule } from "../utils/is-element-scoped-grouping-rule";
import { isInheritedStyleProp } from "../utils/is-inherited-style-prop";
import { isMemoSafeSelector } from "../utils/is-memo-safe-selector";
import { isShorthandStyleProp } from "../utils/is-shorthand-style-prop";
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
  const styleRelevantAttributeNames = new Set<string>(ALWAYS_STYLE_RELEVANT_ATTRIBUTE_NAMES);
  const addSelectorAttributeNames = (selectorText: string): void => {
    if (selectorText.includes("#")) styleRelevantAttributeNames.add("id");
    if (!selectorText.includes("[")) return;
    for (const attributeMatch of selectorText.matchAll(ATTRIBUTE_SELECTOR_NAME_PATTERN)) {
      styleRelevantAttributeNames.add(attributeMatch[1].toLowerCase());
    }
  };
  const propertyNames: string[] = [];
  let isMemoSafe = true;
  let isPseudoContentMemoSafe = true;
  let isInitialScanDone = false;
  const animatedProps = new Set<string>();
  // Margins, paddings, and insets normally resolve per element (percentages,
  // auto, positioned offsets), but when every declaration that could reach
  // them uses a viewport/font/absolute unit their resolved value is pinned by
  // the matched rules — which the memo descriptor already keys — so they can
  // leave the per-element re-read lane entirely.
  const layoutUnstableProps = new Set<string>();
  const markLayoutUnstable = (propertyName: string): void => {
    if (layoutUnstableProps.has(propertyName)) return;
    layoutUnstableProps.add(propertyName);
    if (isInitialScanDone) isMemoSafe = false;
  };
  const checkDeclaredValueStability = (
    declaration: CSSStyleDeclaration,
    propertyName: string,
  ): void => {
    if (propertyName === "position") {
      if (declaration.getPropertyValue("position") !== "static") {
        for (const insetProp of INSET_STYLE_PROPS) markLayoutUnstable(insetProp);
      }
      return;
    }
    // A mid-flight transition holds per-element intermediate values that no
    // rule declares, so transitioned candidates lose their stability proof.
    if (propertyName === "transition-property") {
      const transitionedValue = declaration.getPropertyValue("transition-property");
      for (const candidateProp of CLASS_STABLE_CANDIDATE_STYLE_PROPS) {
        if (transitionedValue.includes("all") || transitionedValue.includes(candidateProp)) {
          markLayoutUnstable(candidateProp);
        }
      }
      return;
    }
    // A computed transform serializes to a constant matrix unless a length
    // inside it resolves against the element's own box (percentages, calc,
    // var); when every declared transform is box-independent the matrix is
    // pinned by the matched rules.
    if (propertyName === "transform") {
      if (layoutUnstableProps.has("transform")) return;
      if (BOX_RELATIVE_VALUE_PATTERN.test(declaration.getPropertyValue("transform"))) {
        markLayoutUnstable("transform");
      }
      return;
    }
    if (CLASS_STABLE_CANDIDATE_STYLE_PROPS.has(propertyName)) {
      if (layoutUnstableProps.has(propertyName)) return;
      if (!STABLE_DECLARED_VALUE_PATTERN.test(declaration.getPropertyValue(propertyName))) {
        markLayoutUnstable(propertyName);
      }
      return;
    }
    // Logical properties resolve onto writing-mode-dependent physical
    // longhands, so an unstable logical value taints its whole physical group.
    const logicalGroupPrefix = ["margin-", "padding-", "inset"].find((groupPrefix) =>
      propertyName.startsWith(groupPrefix),
    );
    if (
      logicalGroupPrefix !== undefined &&
      !STABLE_DECLARED_VALUE_PATTERN.test(declaration.getPropertyValue(propertyName))
    ) {
      const physicalPrefix = logicalGroupPrefix === "inset" ? "" : logicalGroupPrefix;
      for (const candidateProp of CLASS_STABLE_CANDIDATE_STYLE_PROPS) {
        if (
          physicalPrefix === ""
            ? INSET_STYLE_PROPS.includes(candidateProp)
            : candidateProp.startsWith(physicalPrefix)
        ) {
          markLayoutUnstable(candidateProp);
        }
      }
    }
  };
  const addProp = (propertyName: string): void => {
    if (seenProps.has(propertyName)) return;
    seenProps.add(propertyName);
    if (shouldSkipStyleProp(propertyName)) return;
    propertyNames.push(propertyName);
  };

  // Animated properties vary per element (each element sits at its own
  // animation progress), so they join the per-element snapshot lane instead of
  // disabling style memoization outright. Custom properties (whose var()
  // consumers cannot be enumerated), inherited properties (which cascade into
  // descendants), and shorthands (whose longhand expansion the per-element
  // reader would miss) still force the memo off.
  const addAnimatedProp = (propertyName: string): void => {
    if (shouldSkipStyleProp(propertyName)) {
      if (propertyName.startsWith("--")) isMemoSafe = false;
      return;
    }
    if (isInheritedStyleProp(propertyName) || isShorthandStyleProp(propertyName)) {
      isMemoSafe = false;
    } else if (!animatedProps.has(propertyName)) {
      if (isInitialScanDone) isMemoSafe = false;
      animatedProps.add(propertyName);
      layoutUnstableProps.add(propertyName);
    }
    addProp(propertyName);
  };

  const addDeclarationProps = (declaration: CSSStyleDeclaration): void => {
    for (let propertyIndex = 0; propertyIndex < declaration.length; propertyIndex++) {
      const propertyName = declaration.item(propertyIndex);
      if (isPseudoContentMemoSafe && propertyName === "content") {
        const contentValue = declaration.getPropertyValue("content");
        if (contentValue.includes("attr(") || contentValue.includes("counter")) {
          isPseudoContentMemoSafe = false;
        }
      }
      checkDeclaredValueStability(declaration, propertyName);
      addProp(propertyName);
    }
  };

  const addRuleProps = (rule: CSSRule): void => {
    if (isCssStyleRule(rule)) {
      if (isMemoSafe && !isMemoSafeSelector(rule.selectorText)) isMemoSafe = false;
      addSelectorAttributeNames(rule.selectorText);
      addDeclarationProps(rule.style);
    } else if (isCssKeyframesRule(rule)) {
      for (const keyframeRule of rule.cssRules) {
        if (!(keyframeRule instanceof CSSKeyframeRule)) continue;
        const keyframeStyle = keyframeRule.style;
        for (let propertyIndex = 0; propertyIndex < keyframeStyle.length; propertyIndex++) {
          addAnimatedProp(keyframeStyle.item(propertyIndex));
        }
      }
    } else if (isCssGroupingRule(rule) && isElementScopedGroupingRule(rule)) {
      isMemoSafe = false;
    }
  };

  const addWaapiAnimationProps = (): void => {
    if (typeof sourceDocument.getAnimations !== "function") return;
    for (const animation of sourceDocument.getAnimations()) {
      const animationEffect = animation.effect;
      if (!(animationEffect instanceof KeyframeEffect)) {
        isMemoSafe = false;
        continue;
      }
      for (const keyframe of animationEffect.getKeyframes()) {
        for (const keyframeProp in keyframe) {
          if (WAAPI_KEYFRAME_META_KEYS.has(keyframeProp)) continue;
          addAnimatedProp(waapiKeyframePropToCssProp(keyframeProp));
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
  isInitialScanDone = true;
  const perElementPropertyNames = [
    ...PER_ELEMENT_SNAPSHOT_STYLE_PROPS.filter(
      (propertyName) =>
        seenProps.has(propertyName) &&
        (!CLASS_STABLE_CANDIDATE_STYLE_PROPS.has(propertyName) ||
          layoutUnstableProps.has(propertyName)),
    ),
    ...[...animatedProps].filter(
      (propertyName) => !PER_ELEMENT_SNAPSHOT_STYLE_PROPS.includes(propertyName),
    ),
  ];

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
    styleRelevantAttributeNames,
    perElementPropertyNames,
    isStyleMemoSafe: () => isMemoSafe,
    isPseudoContentMemoSafe: () => isPseudoContentMemoSafe,
    addInlineStyleProps,
    addShadowRootStyleProps,
  };
};

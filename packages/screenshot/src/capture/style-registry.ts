import { CSS_TEXT_CACHE_CAP, GENERATED_CLASS_PREFIX } from "../constants";
import type {
  StyleDeclarationMap,
  StyleRegistry,
  StyleRuleDeclarationBlocks,
  StyleRuleRecord,
} from "../types";
import { createFifoCache } from "../utils/create-fifo-cache";
import { getResourceCacheGeneration } from "./resource-loader";

// The emitted stylesheet is a pure function of the registered rule signatures
// (captured before the inline pass rewrites url() values) and the resource
// cache state that rewrite draws from, so repeat captures of an unchanged tree
// can reuse the previous text instead of re-grouping declarations.
const cssTextCache = createFifoCache<string>(CSS_TEXT_CACHE_CAP);

const buildInsertionOrderDeclarationBlock = (styles: StyleDeclarationMap): string => {
  let declarationBlock = "";
  for (const propertyName in styles) {
    declarationBlock += `${propertyName}:${styles[propertyName]};`;
  }
  return declarationBlock;
};

export const createStyleRegistry = (): StyleRegistry => {
  const classNameByInsertionOrderSignature = new Map<string, string>();
  const rules: StyleRuleRecord[] = [];

  const register = (
    baseStyles: StyleDeclarationMap,
    beforeStyles: StyleDeclarationMap | null,
    afterStyles: StyleDeclarationMap | null,
    firstLetterStyles: StyleDeclarationMap | null,
    markerStyles: StyleDeclarationMap | null,
  ): string => {
    // Identical diffed maps built through the same code paths share insertion
    // order, so an order-sensitive signature is enough to collapse duplicates;
    // order-divergent equal maps (never observed on the profiled fixtures)
    // merely emit a redundant rule with identical declarations.
    const cachedBlocks: StyleRuleDeclarationBlocks = {
      base: buildInsertionOrderDeclarationBlock(baseStyles),
      before: beforeStyles ? buildInsertionOrderDeclarationBlock(beforeStyles) : "",
      after: afterStyles ? buildInsertionOrderDeclarationBlock(afterStyles) : "",
      firstLetter: firstLetterStyles ? buildInsertionOrderDeclarationBlock(firstLetterStyles) : "",
      marker: markerStyles ? buildInsertionOrderDeclarationBlock(markerStyles) : "",
    };
    const insertionOrderSignature =
      `${cachedBlocks.base}` +
      `|before:${cachedBlocks.before}` +
      `|after:${cachedBlocks.after}` +
      `|first-letter:${cachedBlocks.firstLetter}` +
      `|marker:${cachedBlocks.marker}`;
    const fastPathClassName = classNameByInsertionOrderSignature.get(insertionOrderSignature);
    if (fastPathClassName) return fastPathClassName;
    const className = `${GENERATED_CLASS_PREFIX}${rules.length + 1}`;
    classNameByInsertionOrderSignature.set(insertionOrderSignature, className);
    rules.push({
      className,
      signature: insertionOrderSignature,
      baseStyles,
      beforeStyles,
      afterStyles,
      firstLetterStyles,
      markerStyles,
      cachedBlocks,
    });
    return className;
  };

  // Emitted maps hold longhands only, so declaration order never changes the
  // cascade result and the key sort can be skipped when printing. Base
  // declarations repeated verbatim across classes (most of the stylesheet on
  // class-heavy pages) are hoisted into selector-list rules keyed by the exact
  // set of classes sharing them; each property appears at most once per class
  // and all emitted rules share specificity, so hoisting cannot change the
  // cascade result.
  const toCssText = (): string => {
    let cssTextCacheKey = `${getResourceCacheGeneration()}`;
    for (const rule of rules) cssTextCacheKey += `\u0000${rule.signature}`;
    const cachedCssText = cssTextCache.get(cssTextCacheKey);
    if (cachedCssText !== undefined) return cachedCssText;
    const classListsByDeclaration = new Map<string, string[]>();
    for (const rule of rules) {
      const baseStyles = rule.baseStyles;
      for (const propertyName in baseStyles) {
        const declaration = `${propertyName}:${baseStyles[propertyName]};`;
        const classList = classListsByDeclaration.get(declaration);
        if (classList === undefined) classListsByDeclaration.set(declaration, [rule.className]);
        else classList.push(rule.className);
      }
    }
    const declarationsByClassListKey = new Map<string, string>();
    for (const [declaration, classList] of classListsByDeclaration) {
      if (classList.length < 2) continue;
      const classListKey = classList.join(",.");
      declarationsByClassListKey.set(
        classListKey,
        (declarationsByClassListKey.get(classListKey) ?? "") + declaration,
      );
    }
    // Identical whole pseudo blocks repeat verbatim across classes on
    // pseudo-heavy pages; grouping them into selector-list rules keeps
    // specificity equal, so the cascade result is unchanged.
    const beforeClassListsByBlock = new Map<string, string[]>();
    const afterClassListsByBlock = new Map<string, string[]>();
    let cssText = "";
    for (const [classListKey, declarations] of declarationsByClassListKey) {
      cssText += `.${classListKey}{${declarations}}\n`;
    }
    for (const rule of rules) {
      const baseStyles = rule.baseStyles;
      let residualBlock = "";
      for (const propertyName in baseStyles) {
        const declaration = `${propertyName}:${baseStyles[propertyName]};`;
        const classList = classListsByDeclaration.get(declaration);
        if (classList !== undefined && classList.length >= 2) continue;
        residualBlock += declaration;
      }
      let ruleText = `.${rule.className}{${residualBlock}}`;
      const blocks: StyleRuleDeclarationBlocks | null = rule.cachedBlocks;
      const beforeBlock =
        blocks?.before ??
        (rule.beforeStyles ? buildInsertionOrderDeclarationBlock(rule.beforeStyles) : "");
      const afterBlock =
        blocks?.after ??
        (rule.afterStyles ? buildInsertionOrderDeclarationBlock(rule.afterStyles) : "");
      const firstLetterBlock =
        blocks?.firstLetter ??
        (rule.firstLetterStyles ? buildInsertionOrderDeclarationBlock(rule.firstLetterStyles) : "");
      const markerBlock =
        blocks?.marker ??
        (rule.markerStyles ? buildInsertionOrderDeclarationBlock(rule.markerStyles) : "");
      if (beforeBlock) {
        const beforeClassList = beforeClassListsByBlock.get(beforeBlock);
        if (beforeClassList === undefined)
          beforeClassListsByBlock.set(beforeBlock, [rule.className]);
        else beforeClassList.push(rule.className);
      }
      if (afterBlock) {
        const afterClassList = afterClassListsByBlock.get(afterBlock);
        if (afterClassList === undefined) afterClassListsByBlock.set(afterBlock, [rule.className]);
        else afterClassList.push(rule.className);
      }
      if (firstLetterBlock) ruleText += `\n.${rule.className}::first-letter{${firstLetterBlock}}`;
      if (markerBlock) ruleText += `\n.${rule.className}::marker{${markerBlock}}`;
      cssText += `${ruleText}\n`;
    }
    for (const [beforeBlock, classList] of beforeClassListsByBlock) {
      cssText += `.${classList.join("::before,.")}::before{${beforeBlock}}\n`;
    }
    for (const [afterBlock, classList] of afterClassListsByBlock) {
      cssText += `.${classList.join("::after,.")}::after{${afterBlock}}\n`;
    }
    const finalCssText = cssText.slice(0, -1);
    cssTextCache.set(cssTextCacheKey, finalCssText);
    return finalCssText;
  };

  return { rules, register, toCssText };
};

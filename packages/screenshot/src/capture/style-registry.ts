import { GENERATED_CLASS_PREFIX } from "../constants";
import type {
  StyleDeclarationMap,
  StyleRegistry,
  StyleRuleDeclarationBlocks,
  StyleRuleRecord,
} from "../types";

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
  // cascade result and the key sort can be skipped when printing.
  const toCssText = (): string =>
    rules
      .map((rule) => {
        const blocks: StyleRuleDeclarationBlocks = rule.cachedBlocks ?? {
          base: buildInsertionOrderDeclarationBlock(rule.baseStyles),
          before: rule.beforeStyles ? buildInsertionOrderDeclarationBlock(rule.beforeStyles) : "",
          after: rule.afterStyles ? buildInsertionOrderDeclarationBlock(rule.afterStyles) : "",
          firstLetter: rule.firstLetterStyles
            ? buildInsertionOrderDeclarationBlock(rule.firstLetterStyles)
            : "",
          marker: rule.markerStyles ? buildInsertionOrderDeclarationBlock(rule.markerStyles) : "",
        };
        let ruleText = `.${rule.className}{${blocks.base}}`;
        if (blocks.before) ruleText += `\n.${rule.className}::before{${blocks.before}}`;
        if (blocks.after) ruleText += `\n.${rule.className}::after{${blocks.after}}`;
        if (blocks.firstLetter) {
          ruleText += `\n.${rule.className}::first-letter{${blocks.firstLetter}}`;
        }
        if (blocks.marker) ruleText += `\n.${rule.className}::marker{${blocks.marker}}`;
        return ruleText;
      })
      .join("\n");

  return { rules, register, toCssText };
};

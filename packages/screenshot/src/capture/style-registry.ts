import { GENERATED_CLASS_PREFIX } from "../constants";
import type { StyleDeclarationMap, StyleRegistry, StyleRuleRecord } from "../types";

const buildInsertionOrderDeclarationBlock = (styles: StyleDeclarationMap): string => {
  let declarationBlock = "";
  for (const propertyName in styles) {
    declarationBlock += `${propertyName}:${styles[propertyName]};`;
  }
  return declarationBlock;
};

const buildInsertionOrderSignature = (
  baseStyles: StyleDeclarationMap,
  beforeStyles: StyleDeclarationMap | null,
  afterStyles: StyleDeclarationMap | null,
  firstLetterStyles: StyleDeclarationMap | null,
  markerStyles: StyleDeclarationMap | null,
): string =>
  `${buildInsertionOrderDeclarationBlock(baseStyles)}` +
  `|before:${beforeStyles ? buildInsertionOrderDeclarationBlock(beforeStyles) : ""}` +
  `|after:${afterStyles ? buildInsertionOrderDeclarationBlock(afterStyles) : ""}` +
  `|first-letter:${firstLetterStyles ? buildInsertionOrderDeclarationBlock(firstLetterStyles) : ""}` +
  `|marker:${markerStyles ? buildInsertionOrderDeclarationBlock(markerStyles) : ""}`;

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
    const insertionOrderSignature = buildInsertionOrderSignature(
      baseStyles,
      beforeStyles,
      afterStyles,
      firstLetterStyles,
      markerStyles,
    );
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
    });
    return className;
  };

  // Emitted maps hold longhands only, so declaration order never changes the
  // cascade result and the key sort can be skipped when printing.
  const toCssText = (): string =>
    rules
      .map((rule) => {
        let ruleText = `.${rule.className}{${buildInsertionOrderDeclarationBlock(rule.baseStyles)}}`;
        if (rule.beforeStyles) {
          ruleText += `\n.${rule.className}::before{${buildInsertionOrderDeclarationBlock(rule.beforeStyles)}}`;
        }
        if (rule.afterStyles) {
          ruleText += `\n.${rule.className}::after{${buildInsertionOrderDeclarationBlock(rule.afterStyles)}}`;
        }
        if (rule.firstLetterStyles) {
          ruleText += `\n.${rule.className}::first-letter{${buildInsertionOrderDeclarationBlock(rule.firstLetterStyles)}}`;
        }
        if (rule.markerStyles) {
          ruleText += `\n.${rule.className}::marker{${buildInsertionOrderDeclarationBlock(rule.markerStyles)}}`;
        }
        return ruleText;
      })
      .join("\n");

  return { rules, register, toCssText };
};

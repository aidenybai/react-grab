import { GENERATED_CLASS_PREFIX } from "../constants";
import type { StyleDeclarationMap, StyleRegistry, StyleRuleRecord } from "../types";

const buildDeclarationBlock = (styles: StyleDeclarationMap): string => {
  const propertyNames = Object.keys(styles).sort();
  let declarationBlock = "";
  for (let propertyIndex = 0; propertyIndex < propertyNames.length; propertyIndex++) {
    const propertyName = propertyNames[propertyIndex];
    declarationBlock += `${propertyName}:${styles[propertyName]};`;
  }
  return declarationBlock;
};

const buildInsertionOrderDeclarationBlock = (styles: StyleDeclarationMap): string => {
  let declarationBlock = "";
  for (const propertyName in styles) {
    declarationBlock += `${propertyName}:${styles[propertyName]};`;
  }
  return declarationBlock;
};

const buildSortedSignature = (
  baseStyles: StyleDeclarationMap,
  beforeStyles: StyleDeclarationMap | null,
  afterStyles: StyleDeclarationMap | null,
  firstLetterStyles: StyleDeclarationMap | null,
  markerStyles: StyleDeclarationMap | null,
): string =>
  `${buildDeclarationBlock(baseStyles)}` +
  `|before:${beforeStyles ? buildDeclarationBlock(beforeStyles) : ""}` +
  `|after:${afterStyles ? buildDeclarationBlock(afterStyles) : ""}` +
  `|first-letter:${firstLetterStyles ? buildDeclarationBlock(firstLetterStyles) : ""}` +
  `|marker:${markerStyles ? buildDeclarationBlock(markerStyles) : ""}`;

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
  const classNameBySignature = new Map<string, string>();
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
    // order, so an order-sensitive signature resolves most duplicates without
    // paying the per-element key sort; the sorted signature stays the source
    // of truth so order-divergent duplicates still collapse into one class.
    const insertionOrderSignature = buildInsertionOrderSignature(
      baseStyles,
      beforeStyles,
      afterStyles,
      firstLetterStyles,
      markerStyles,
    );
    const fastPathClassName = classNameByInsertionOrderSignature.get(insertionOrderSignature);
    if (fastPathClassName) return fastPathClassName;
    const signature = buildSortedSignature(
      baseStyles,
      beforeStyles,
      afterStyles,
      firstLetterStyles,
      markerStyles,
    );
    const existingClassName = classNameBySignature.get(signature);
    if (existingClassName) {
      classNameByInsertionOrderSignature.set(insertionOrderSignature, existingClassName);
      return existingClassName;
    }
    const className = `${GENERATED_CLASS_PREFIX}${rules.length + 1}`;
    classNameBySignature.set(signature, className);
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

  const toCssText = (): string =>
    rules
      .map((rule) => {
        let ruleText = `.${rule.className}{${buildDeclarationBlock(rule.baseStyles)}}`;
        if (rule.beforeStyles) {
          ruleText += `\n.${rule.className}::before{${buildDeclarationBlock(rule.beforeStyles)}}`;
        }
        if (rule.afterStyles) {
          ruleText += `\n.${rule.className}::after{${buildDeclarationBlock(rule.afterStyles)}}`;
        }
        if (rule.firstLetterStyles) {
          ruleText += `\n.${rule.className}::first-letter{${buildDeclarationBlock(rule.firstLetterStyles)}}`;
        }
        if (rule.markerStyles) {
          ruleText += `\n.${rule.className}::marker{${buildDeclarationBlock(rule.markerStyles)}}`;
        }
        return ruleText;
      })
      .join("\n");

  return { rules, register, toCssText };
};

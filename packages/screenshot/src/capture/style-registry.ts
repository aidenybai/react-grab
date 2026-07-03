import { GENERATED_CLASS_PREFIX } from "../constants";
import type { StyleDeclarationMap, StyleRegistry, StyleRuleRecord } from "../types";

const buildDeclarationBlock = (styles: StyleDeclarationMap): string =>
  Object.keys(styles)
    .sort()
    .map((propertyName) => `${propertyName}:${styles[propertyName]};`)
    .join("");

export const createStyleRegistry = (): StyleRegistry => {
  const classNameBySignature = new Map<string, string>();
  const rules: StyleRuleRecord[] = [];

  const register = (
    baseStyles: StyleDeclarationMap,
    beforeStyles: StyleDeclarationMap | null,
    afterStyles: StyleDeclarationMap | null,
    firstLetterStyles: StyleDeclarationMap | null,
    markerStyles: StyleDeclarationMap | null,
  ): string => {
    const signature =
      `${buildDeclarationBlock(baseStyles)}` +
      `|before:${beforeStyles ? buildDeclarationBlock(beforeStyles) : ""}` +
      `|after:${afterStyles ? buildDeclarationBlock(afterStyles) : ""}` +
      `|first-letter:${firstLetterStyles ? buildDeclarationBlock(firstLetterStyles) : ""}` +
      `|marker:${markerStyles ? buildDeclarationBlock(markerStyles) : ""}`;
    const existingClassName = classNameBySignature.get(signature);
    if (existingClassName) return existingClassName;
    const className = `${GENERATED_CLASS_PREFIX}${rules.length + 1}`;
    classNameBySignature.set(signature, className);
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

import type { EditableProperty } from "../types.js";
import { editablePropertyToCssProperties, formatEditableValue } from "./build-editable-properties.js";

export interface EditPromptChange {
  property: EditableProperty;
  value: number;
}

interface FormatEditDiffInput {
  changes: EditPromptChange[];
}

export const formatStyleDiffPrompt = ({ changes }: FormatEditDiffInput): string => {
  if (changes.length === 0) return "";

  const lines: string[] = [];
  for (const { property, value } of changes) {
    const cssValue = formatEditableValue({ ...property, value });
    for (const cssProperty of editablePropertyToCssProperties(property.property)) {
      lines.push(`${cssProperty}: ${cssValue};`);
    }
  }
  return ["Apply these style changes:", "```css", ...lines, "```"].join("\n");
};

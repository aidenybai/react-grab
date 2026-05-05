import {
  COMPONENT_INSTANCE_MAX_PROPS,
  COMPONENT_INSTANCE_MAX_VALUE_LENGTH_CHARS,
} from "../constants.js";
import { truncateString } from "./truncate-string.js";

interface ComponentInstance {
  name: string;
  props: Record<string, unknown> | null;
}

const SKIP_PROP_NAMES = new Set(["children", "key", "ref", "dangerouslySetInnerHTML"]);

const formatPropValue = (value: unknown): string | null => {
  if (value === null) return "{null}";
  if (value === undefined) return null;

  if (typeof value === "string") {
    return `"${truncateString(value, COMPONENT_INSTANCE_MAX_VALUE_LENGTH_CHARS)}"`;
  }
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return `{${String(value)}}`;
  }
  if (typeof value === "function") {
    const functionName = typeof value.name === "string" ? value.name : "";
    return functionName ? `{[Function: ${functionName}]}` : "{[Function]}";
  }
  if (typeof value === "symbol") {
    return `{${value.toString()}}`;
  }
  if (Array.isArray(value)) {
    return value.length === 0 ? "{[]}" : `{[${value.length} items]}`;
  }
  if (typeof value === "object") {
    if (value instanceof Date) return `{Date(${value.toISOString()})}`;
    if (value instanceof RegExp) return `{${value.toString()}}`;
    if (typeof Element !== "undefined" && value instanceof Element) {
      return `{<${value.localName} ...>}`;
    }
    return "{{...}}";
  }
  return null;
};

const isRenderablePropName = (name: string): boolean => {
  if (SKIP_PROP_NAMES.has(name)) return false;
  if (name.startsWith("__")) return false;
  if (name.startsWith("$$")) return false;
  return true;
};

export const formatComponentInstance = (instance: ComponentInstance): string => {
  const { name, props } = instance;
  if (!props) return `<${name} />`;

  const renderedAttrs: string[] = [];
  let truncatedCount = 0;

  for (const propName of Object.keys(props)) {
    if (!isRenderablePropName(propName)) continue;
    if (renderedAttrs.length >= COMPONENT_INSTANCE_MAX_PROPS) {
      truncatedCount++;
      continue;
    }
    const formatted = formatPropValue(props[propName]);
    if (formatted === null) continue;
    if (formatted === "{true}") {
      renderedAttrs.push(propName);
      continue;
    }
    renderedAttrs.push(`${propName}=${formatted}`);
  }

  if (renderedAttrs.length === 0 && truncatedCount === 0) return `<${name} />`;

  const attrText = renderedAttrs.join(" ");
  const ellipsis = truncatedCount > 0 ? ` /* +${truncatedCount} more */` : "";
  return `<${name} ${attrText}${ellipsis} />`;
};

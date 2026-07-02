import type { DialControl, DialValue } from "../types.js";

export const collectDialDefaults = (controls: DialControl[]): Record<string, DialValue> => {
  const defaults: Record<string, DialValue> = {};
  const walk = (nodes: DialControl[]) => {
    for (const node of nodes) {
      if (node.kind === "folder") {
        walk(node.children);
      } else if (node.kind !== "action") {
        defaults[node.path] = node.default;
      }
    }
  };
  walk(controls);
  return defaults;
};

export const resolveDialValues = (
  controls: DialControl[],
  valuesByPath: Record<string, DialValue>,
): Record<string, unknown> => {
  const resolved: Record<string, unknown> = {};
  for (const node of controls) {
    if (node.kind === "action") continue;
    if (node.kind === "folder") {
      resolved[node.key] = resolveDialValues(node.children, valuesByPath);
      continue;
    }
    resolved[node.key] = valuesByPath[node.path] ?? node.default;
  }
  return resolved;
};

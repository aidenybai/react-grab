import {
  getFiberHooks,
  parseHookNames,
  getHookSourceLocationKey,
  type HooksTree,
} from "bippy/source";
import type { InspectPropertyRow } from "../types.js";
import { formatPropValue } from "./format-prop-value.js";
import { findNearestCompositeFiber } from "./find-nearest-composite-fiber.js";
import { INSPECT_MAX_HOOKS } from "../constants.js";

const buildHookRows = (
  hooksTree: HooksTree,
  hookNames?: Map<string, string>,
): InspectPropertyRow[] =>
  hooksTree
    .filter((hookNode) => hookNode.isStateEditable)
    .slice(0, INSPECT_MAX_HOOKS)
    .map((hookNode) => {
      const resolvedName =
        hookNode.hookSource && hookNames
          ? hookNames.get(getHookSourceLocationKey(hookNode.hookSource))
          : undefined;
      return {
        label: resolvedName ?? hookNode.name,
        value: formatPropValue(hookNode.value),
      };
    });

export const getHooksState = (element: Element): InspectPropertyRow[] => {
  const compositeFiber = findNearestCompositeFiber(element);
  if (!compositeFiber) return [];

  return buildHookRows(getFiberHooks(compositeFiber));
};

export const resolveHookNames = async (
  element: Element,
): Promise<InspectPropertyRow[] | null> => {
  const compositeFiber = findNearestCompositeFiber(element);
  if (!compositeFiber) return null;

  const hooksTree = getFiberHooks(compositeFiber);
  const editableHooks = hooksTree.filter((hookNode) => hookNode.isStateEditable);
  if (editableHooks.length === 0) return null;

  const hookNames = await parseHookNames(hooksTree);
  if (hookNames.size === 0) return null;

  return buildHookRows(hooksTree, hookNames);
};

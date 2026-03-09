import type { ElementSourceInfo } from "../../types.js";
import {
  resolveReactSourceInfo,
  getReactComponentName,
  getReactDisplayName,
} from "./react.js";
import { getSvelteStackFrames } from "./svelte.js";
import { getVueStackFrames } from "./vue.js";
import { getSolidStackFrames } from "./solid.js";

type FrameworkStackResolver = (
  element: Element,
) => ElementSourceInfo[] | Promise<ElementSourceInfo[]>;

const FRAMEWORK_STACK_RESOLVERS: FrameworkStackResolver[] = [
  getSvelteStackFrames,
  getVueStackFrames,
  getSolidStackFrames,
];

const resolveFrameworkStack = async (
  element: Element,
): Promise<ElementSourceInfo[]> => {
  for (const resolveStackFrames of FRAMEWORK_STACK_RESOLVERS) {
    const stackFrames = await resolveStackFrames(element);
    if (stackFrames.length < 1) continue;
    const validStackFrames = stackFrames.filter(
      (stackFrame) => stackFrame.filePath.length > 0,
    );
    if (validStackFrames.length < 1) continue;
    return validStackFrames;
  }

  return [];
};

export const resolveElementStack = async (
  element: Element,
): Promise<ElementSourceInfo[]> => {
  const reactSource = await resolveReactSourceInfo(element);
  const frameworkStack = await resolveFrameworkStack(element);

  if (reactSource) return [reactSource, ...frameworkStack];
  return frameworkStack;
};

export const resolveElementSourceInfo = async (
  element: Element,
): Promise<ElementSourceInfo | null> => {
  const stack = await resolveElementStack(element);
  return stack[0] ?? null;
};

export const resolveElementComponentName = async (
  element: Element,
): Promise<string | null> => {
  const reactComponentName = await getReactComponentName(element);
  if (reactComponentName) return reactComponentName;

  const stack = await resolveElementStack(element);
  const frameworkComponentName = stack.find(
    (frame) => frame.componentName,
  )?.componentName;
  if (frameworkComponentName) return frameworkComponentName;

  return getReactDisplayName(element);
};

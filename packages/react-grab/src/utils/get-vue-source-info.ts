import type { ElementSourceInfo } from "../types.js";
import { parseSourceLocation } from "./parse-source-location.js";

const VUE_INSPECTOR_ATTRIBUTE_NAME = "data-v-inspector";
const VUE_INSPECTOR_SELECTOR = `[${VUE_INSPECTOR_ATTRIBUTE_NAME}]`;
const VUE_PARENT_COMPONENT_PROPERTY_NAME = "__vueParentComponent";
const VUE_PARENT_COMPONENT_PARENT_PROPERTY_NAME = "parent";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const getVueComponentType = (
  component: Record<string, unknown> | null,
): Record<string, unknown> | null => {
  if (!component) return null;
  const componentType = component.type;
  return isRecord(componentType) ? componentType : null;
};

const getVueParentComponent = (
  element: Element,
): Record<string, unknown> | null => {
  const component = Reflect.get(element, VUE_PARENT_COMPONENT_PROPERTY_NAME);
  return isRecord(component) ? component : null;
};

const getVueParentComponentFromComponent = (
  component: Record<string, unknown> | null,
): Record<string, unknown> | null => {
  if (!component) return null;
  const parentComponent = Reflect.get(
    component,
    VUE_PARENT_COMPONENT_PARENT_PROPERTY_NAME,
  );
  return isRecord(parentComponent) ? parentComponent : null;
};

const getNearestVueParentComponent = (
  element: Element,
): Record<string, unknown> | null => {
  let currentElement: Element | null = element;
  while (currentElement) {
    const component = getVueParentComponent(currentElement);
    if (component) return component;
    currentElement = currentElement.parentElement;
  }
  return null;
};

const getVueComponentName = (
  componentType: Record<string, unknown> | null,
): string | null => {
  if (!componentType) return null;
  return readString(componentType.__name) ?? readString(componentType.name);
};

const getVueComponentFilePath = (
  componentType: Record<string, unknown> | null,
): string | null => {
  if (!componentType) return null;
  return readString(componentType.__file);
};

const getVueComponentChain = (element: Element): Record<string, unknown>[] => {
  const componentChain: Record<string, unknown>[] = [];
  const nearestComponent = getNearestVueParentComponent(element);
  let currentComponent: Record<string, unknown> | null = nearestComponent;

  while (currentComponent) {
    componentChain.push(currentComponent);
    currentComponent = getVueParentComponentFromComponent(currentComponent);
  }

  return componentChain;
};

const getVueRuntimeStackFrames = (element: Element): ElementSourceInfo[] =>
  getVueComponentChain(element)
    .map((component): ElementSourceInfo | null => {
      const componentType = getVueComponentType(component);
      const filePath = getVueComponentFilePath(componentType);
      if (!filePath) return null;
      return {
        filePath,
        lineNumber: null,
        columnNumber: null,
        componentName: getVueComponentName(componentType),
      };
    })
    .filter((frame): frame is ElementSourceInfo => Boolean(frame));

const resolveFromInspectorAttribute = (
  element: Element,
): ElementSourceInfo | null => {
  const sourceElement = element.closest(VUE_INSPECTOR_SELECTOR);
  if (!sourceElement) return null;

  const sourceLocation = sourceElement.getAttribute(
    VUE_INSPECTOR_ATTRIBUTE_NAME,
  );
  if (!sourceLocation) return null;

  const parsedLocation = parseSourceLocation(sourceLocation);
  if (!parsedLocation) return null;

  const nearestComponent = getNearestVueParentComponent(element);
  const nearestComponentType = getVueComponentType(nearestComponent);
  const componentName = getVueComponentName(nearestComponentType);

  return {
    filePath: parsedLocation.filePath,
    lineNumber: parsedLocation.lineNumber,
    columnNumber: parsedLocation.columnNumber,
    componentName,
  };
};

export const getVueStackFrames = (element: Element): ElementSourceInfo[] => {
  const combinedStackFrames: ElementSourceInfo[] = [];
  const seenFrameIdentities = new Set<string>();

  const inspectorInfo = resolveFromInspectorAttribute(element);
  if (inspectorInfo) {
    const inspectorFrameIdentity = `${inspectorInfo.filePath}|${inspectorInfo.componentName ?? ""}`;
    combinedStackFrames.push(inspectorInfo);
    seenFrameIdentities.add(inspectorFrameIdentity);
  }

  const runtimeStackFrames = getVueRuntimeStackFrames(element);
  for (const runtimeStackFrame of runtimeStackFrames) {
    const runtimeFrameIdentity = `${runtimeStackFrame.filePath}|${runtimeStackFrame.componentName ?? ""}`;
    if (seenFrameIdentities.has(runtimeFrameIdentity)) continue;
    seenFrameIdentities.add(runtimeFrameIdentity);
    combinedStackFrames.push(runtimeStackFrame);
  }

  return combinedStackFrames;
};

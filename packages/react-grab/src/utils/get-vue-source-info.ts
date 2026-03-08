import type { ElementSourceInfo } from "../types.js";
import { parseSourceLocation } from "./parse-source-location.js";

const VUE_INSPECTOR_ATTRIBUTE_NAME = "data-v-inspector";
const VUE_INSPECTOR_SELECTOR = `[${VUE_INSPECTOR_ATTRIBUTE_NAME}]`;
const VUE_PARENT_COMPONENT_PROPERTY_NAME = "__vueParentComponent";

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

const resolveFromInspectorAttribute = (
  element: Element,
): ElementSourceInfo | null => {
  const sourceElement = element.closest(VUE_INSPECTOR_SELECTOR);
  if (!sourceElement) return null;

  const sourceLocation = sourceElement.getAttribute(VUE_INSPECTOR_ATTRIBUTE_NAME);
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

const resolveFromVueRuntimeMetadata = (
  element: Element,
): ElementSourceInfo | null => {
  const nearestComponent = getNearestVueParentComponent(element);
  const nearestComponentType = getVueComponentType(nearestComponent);
  const filePath = getVueComponentFilePath(nearestComponentType);
  if (!filePath) return null;

  return {
    filePath,
    lineNumber: null,
    columnNumber: null,
    componentName: getVueComponentName(nearestComponentType),
  };
};

export const getVueSourceInfo = (element: Element): ElementSourceInfo | null => {
  const inspectorInfo = resolveFromInspectorAttribute(element);
  if (inspectorInfo) return inspectorInfo;
  return resolveFromVueRuntimeMetadata(element);
};

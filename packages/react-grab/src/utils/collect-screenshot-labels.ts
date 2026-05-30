import {
  _fiberRoots,
  getDisplayName,
  getFiberFromHostInstance,
  isCompositeFiber,
  type Fiber,
  type FiberRoot,
} from "bippy";
import { resolveSource } from "../core/context.js";
import { isUsefulComponentName } from "./is-useful-component-name.js";
import { normalizeFilePath } from "./normalize-file-path.js";

interface FiberRootLike extends FiberRoot {
  current: Fiber | null;
}

interface FiberDebugLink {
  fileName?: string;
  lineNumber?: number;
  columnNumber?: number;
}

const collectFiberRoots = (): Set<FiberRootLike> => {
  const typedFiberRoots = _fiberRoots as Set<FiberRootLike>;
  if (typedFiberRoots.size > 0) return typedFiberRoots;

  const collected = new Set<FiberRootLike>();
  if (typeof document === "undefined") return collected;

  const elementsToVisit: Element[] = [document.body];
  while (elementsToVisit.length > 0) {
    const element = elementsToVisit.pop();
    if (!element) continue;

    const fiber = getFiberFromHostInstance(element);
    if (fiber) {
      let current: Fiber | null = fiber;
      while (current?.return) current = current.return;
      const root = current?.stateNode as FiberRootLike | undefined;
      if (root) collected.add(root);
      continue;
    }
    for (const child of element.children) {
      elementsToVisit.push(child);
    }
  }

  return collected;
};

const getSyncFileName = (fiber: Fiber): string | null => {
  let current: Fiber | null = fiber;
  while (current) {
    const debugSource = current._debugSource as FiberDebugLink | null | undefined;
    if (debugSource?.fileName) {
      return normalizeFilePath(debugSource.fileName);
    }
    current = (current._debugOwner ?? null) as Fiber | null;
  }
  return null;
};

const getFileBaseName = (filePath: string): string => {
  const cleaned = filePath.split("?")[0].split("#")[0].replace(/\\/g, "/");
  const parts = cleaned.split("/");
  return parts[parts.length - 1] || cleaned;
};

const isElementOnscreen = (element: Element): boolean => {
  if (!(element instanceof Element)) return false;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  if (rect.right <= 0 || rect.bottom <= 0) return false;
  if (rect.left >= window.innerWidth || rect.top >= window.innerHeight) return false;
  return true;
};

export interface ScreenshotLabelCandidate {
  fiberId: number;
  element: Element;
  componentName: string;
  fileBaseName: string | null;
}

let fiberIdSequence = 0;
const fiberIdCache = new WeakMap<Fiber, number>();
const getStableFiberId = (fiber: Fiber): number => {
  const cached = fiberIdCache.get(fiber);
  if (cached !== undefined) return cached;
  const id = ++fiberIdSequence;
  fiberIdCache.set(fiber, id);
  return id;
};

const findNearestHostElement = (fiber: Fiber): Element | null => {
  const queue: Array<Fiber | null | undefined> = [fiber.child];
  while (queue.length > 0) {
    const candidate = queue.shift();
    if (!candidate) continue;
    const stateNode = candidate.stateNode;
    if (stateNode instanceof Element) return stateNode;
    if (candidate.child) queue.push(candidate.child);
    if (candidate.sibling) queue.push(candidate.sibling);
  }
  return null;
};

export const collectScreenshotLabels = (): ScreenshotLabelCandidate[] => {
  const fiberRoots = collectFiberRoots();
  const candidates: ScreenshotLabelCandidate[] = [];
  const seenElements = new WeakSet<Element>();
  const walkStack: Array<Fiber | null | undefined> = [];

  for (const fiberRoot of fiberRoots) {
    if (!fiberRoot.current) continue;
    walkStack.push(fiberRoot.current);
  }

  while (walkStack.length > 0) {
    const fiber = walkStack.pop();
    if (!fiber) continue;

    if (fiber.sibling) walkStack.push(fiber.sibling);
    if (fiber.child) walkStack.push(fiber.child);

    if (!isCompositeFiber(fiber)) continue;
    const displayName = getDisplayName(fiber.type);
    if (!displayName || !isUsefulComponentName(displayName)) continue;

    const hostElement = findNearestHostElement(fiber);
    if (!hostElement || seenElements.has(hostElement) || !isElementOnscreen(hostElement)) continue;

    seenElements.add(hostElement);
    const fileName = getSyncFileName(fiber);
    candidates.push({
      fiberId: getStableFiberId(fiber),
      element: hostElement,
      componentName: displayName,
      fileBaseName: fileName ? getFileBaseName(fileName) : null,
    });
  }

  return candidates;
};

export const resolveScreenshotLabelFileName = async (element: Element): Promise<string | null> => {
  try {
    const source = await resolveSource(element);
    if (!source?.filePath) return null;
    return getFileBaseName(normalizeFilePath(source.filePath));
  } catch {
    return null;
  }
};

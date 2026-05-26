import {
  _fiberRoots,
  getDisplayName,
  getFiberFromHostInstance,
  getNearestHostFibers,
  isCompositeFiber,
  traverseFiber,
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
  const walk = (element: Element): void => {
    const fiber = getFiberFromHostInstance(element);
    if (fiber) {
      let current: Fiber | null = fiber;
      while (current?.return) current = current.return;
      const root = current?.stateNode as FiberRootLike | undefined;
      if (root) collected.add(root);
      return;
    }
    for (const child of Array.from(element.children)) {
      walk(child);
    }
  };
  if (typeof document !== "undefined") walk(document.body);
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

export const collectScreenshotLabels = (): ScreenshotLabelCandidate[] => {
  const fiberRoots = collectFiberRoots();
  const candidates: ScreenshotLabelCandidate[] = [];
  const seenElements = new WeakSet<Element>();

  for (const fiberRoot of fiberRoots) {
    if (!fiberRoot.current) continue;
    traverseFiber(
      fiberRoot.current,
      (fiber) => {
        if (!isCompositeFiber(fiber)) return false;
        const displayName = getDisplayName(fiber.type);
        if (!displayName || !isUsefulComponentName(displayName)) return false;

        const hostFibers = getNearestHostFibers(fiber);
        if (hostFibers.length === 0) return false;

        const hostNode = hostFibers[0].stateNode;
        if (!(hostNode instanceof Element)) return false;
        if (seenElements.has(hostNode)) return false;
        if (!isElementOnscreen(hostNode)) return false;

        seenElements.add(hostNode);
        const fileName = getSyncFileName(fiber);
        candidates.push({
          fiberId: getStableFiberId(fiber),
          element: hostNode,
          componentName: displayName,
          fileBaseName: fileName ? getFileBaseName(fileName) : null,
        });
        return false;
      },
      true,
    );
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

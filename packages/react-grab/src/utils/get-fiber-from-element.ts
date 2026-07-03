import { getFiberFromHostInstance, type Fiber } from "bippy";

// bippy's getFiberFromHostInstance resolves the fiber with a `for-in` over the
// element, which enumerates every inherited DOM accessor (~200 keys). React
// stamps the fiber under an own key with a per-renderer random suffix
// (`__reactFiber$<suffix>`), so once one key is seen the lookup for every other
// element from that renderer is a single property read.
const knownFiberKeys: string[] = [];

const FIBER_KEY_PREFIXES = ["__reactFiber$", "__reactContainer$", "__reactInternalInstance$"];

const findOwnFiberKey = (element: Element): string | null => {
  for (const key of Object.keys(element)) {
    for (const prefix of FIBER_KEY_PREFIXES) {
      if (key.startsWith(prefix)) return key;
    }
  }
  return null;
};

export const getFiberFromElement = (element: Element): Fiber | null => {
  const elementRecord = element as unknown as Record<string, Fiber | null | undefined>;
  for (const key of knownFiberKeys) {
    const fiber = elementRecord[key];
    if (fiber) return fiber;
  }
  const ownFiberKey = findOwnFiberKey(element);
  if (ownFiberKey) {
    if (!knownFiberKeys.includes(ownFiberKey)) knownFiberKeys.push(ownFiberKey);
    return elementRecord[ownFiberKey] ?? null;
  }
  return getFiberFromHostInstance(element);
};

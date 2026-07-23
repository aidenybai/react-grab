import type { HostBounds, HostPoint, HostTarget } from "react-grab/targets";
import type {
  MeasuredNativeTarget,
  NativeTargetEntry,
  NativeTargetRegistration,
  NativeTargetRegistry,
} from "./types";
import { measureNativeHandle } from "./utils/measure-native-handle";

const containsPoint = (bounds: HostBounds, point: HostPoint): boolean =>
  point.x >= bounds.x &&
  point.x <= bounds.x + bounds.width &&
  point.y >= bounds.y &&
  point.y <= bounds.y + bounds.height;

const isBetterHit = (
  candidate: MeasuredNativeTarget,
  current: MeasuredNativeTarget | null,
): boolean => {
  if (!current) return true;
  if (candidate.priority !== current.priority) return candidate.priority > current.priority;
  const candidateArea = candidate.bounds.width * candidate.bounds.height;
  const currentArea = current.bounds.width * current.bounds.height;
  if (candidateArea !== currentArea) return candidateArea < currentArea;
  return candidate.registrationOrder > current.registrationOrder;
};

export const createNativeTargetRegistry = (): NativeTargetRegistry => {
  const entryStacks = new Map<string, NativeTargetEntry[]>();
  const targets = new Map<string, HostTarget>();
  let registrationOrder = 0;

  const getCurrentEntry = (targetId: string): NativeTargetEntry | null => {
    const entries = entryStacks.get(targetId);
    return entries?.[entries.length - 1] ?? null;
  };

  const getCurrentEntries = (): NativeTargetEntry[] => {
    const currentEntries: NativeTargetEntry[] = [];
    for (const entries of entryStacks.values()) {
      const currentEntry = entries[entries.length - 1];
      if (currentEntry) currentEntries.push(currentEntry);
    }
    return currentEntries;
  };

  const getTarget = (targetId: string): HostTarget | null => {
    if (!getCurrentEntry(targetId)) return null;
    const existingTarget = targets.get(targetId);
    if (existingTarget) return existingTarget;

    let target: HostTarget;
    target = {
      id: targetId,
      platform: "react-native",
      capabilities: {
        resolve: async () => (getCurrentEntry(targetId) ? target : null),
        measure: async () => {
          const entry = getCurrentEntry(targetId);
          return entry ? measureNativeHandle(entry.handle) : null;
        },
        describe: async () =>
          getCurrentEntry(targetId)?.description ?? {
            name: "unknown",
            role: null,
            label: null,
            testId: null,
          },
        getParent: async () => {
          const parentId = getCurrentEntry(targetId)?.parentId;
          return parentId ? getTarget(parentId) : null;
        },
        getChildren: async () => {
          const children: HostTarget[] = [];
          for (const entry of getCurrentEntries()) {
            if (entry.parentId !== targetId) continue;
            const childTarget = getTarget(entry.id);
            if (childTarget) children.push(childTarget);
          }
          return children;
        },
      },
    };
    targets.set(targetId, target);
    return target;
  };

  return {
    adapter: {
      platform: "react-native",
      getTargetAtPoint: async (point) => {
        const measuredTargets = await Promise.all(
          getCurrentEntries().map(async (entry): Promise<MeasuredNativeTarget | null> => {
            const target = getTarget(entry.id);
            if (!target) return null;
            const bounds = await measureNativeHandle(entry.handle);
            if (!bounds || !containsPoint(bounds, point)) return null;
            return {
              target,
              bounds,
              priority: entry.priority ?? 0,
              registrationOrder: entry.registrationOrder,
            };
          }),
        );
        let bestHit: MeasuredNativeTarget | null = null;
        for (const measuredTarget of measuredTargets) {
          if (measuredTarget && isBetterHit(measuredTarget, bestHit)) bestHit = measuredTarget;
        }
        return bestHit?.target ?? null;
      },
    },
    register: (registration: NativeTargetRegistration) => {
      const entry: NativeTargetEntry = {
        ...registration,
        registrationOrder: registrationOrder++,
      };
      const entries = entryStacks.get(registration.id);
      if (entries) entries.push(entry);
      else entryStacks.set(registration.id, [entry]);

      return {
        unregister: () => {
          const currentEntries = entryStacks.get(registration.id);
          if (!currentEntries) return;
          const entryIndex = currentEntries.indexOf(entry);
          if (entryIndex < 0) return;
          currentEntries.splice(entryIndex, 1);
          if (currentEntries.length > 0) return;
          entryStacks.delete(registration.id);
          targets.delete(registration.id);
        },
        update: (metadata) => {
          entry.description = metadata.description;
          entry.parentId = metadata.parentId;
          entry.priority = metadata.priority;
        },
      };
    },
    getTarget,
  };
};

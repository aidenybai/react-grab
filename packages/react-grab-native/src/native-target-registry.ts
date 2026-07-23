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
  const entries = new Map<string, NativeTargetEntry>();
  const targets = new Map<string, HostTarget>();
  let registrationOrder = 0;

  const getTarget = (targetId: string): HostTarget | null => {
    if (!entries.has(targetId)) return null;
    const existingTarget = targets.get(targetId);
    if (existingTarget) return existingTarget;

    let target: HostTarget;
    target = {
      id: targetId,
      platform: "react-native",
      capabilities: {
        resolve: async () => (entries.has(targetId) ? target : null),
        measure: async () => {
          const entry = entries.get(targetId);
          return entry ? measureNativeHandle(entry.handle) : null;
        },
        describe: async () =>
          entries.get(targetId)?.description ?? {
            name: "unknown",
            role: null,
            label: null,
            testId: null,
          },
        getParent: async () => {
          const parentId = entries.get(targetId)?.parentId;
          return parentId ? getTarget(parentId) : null;
        },
        getChildren: async () => {
          const children: HostTarget[] = [];
          for (const entry of entries.values()) {
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
          Array.from(entries.values(), async (entry): Promise<MeasuredNativeTarget | null> => {
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
      entries.set(registration.id, entry);
      return () => {
        if (entries.get(registration.id) !== entry) return;
        entries.delete(registration.id);
        targets.delete(registration.id);
      };
    },
    getTarget,
  };
};

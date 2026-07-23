import { describe, expect, it } from "vite-plus/test";
import type { HostBounds, HostTargetDescription } from "react-grab/targets";
import { createNativeTargetRegistry } from "../src/native-target-registry";
import type { NativeHostHandle } from "../src/types";
import {
  CHILD_HEIGHT_PX,
  CHILD_WIDTH_PX,
  CHILD_X_PX,
  CHILD_Y_PX,
  HIT_X_PX,
  HIT_Y_PX,
  PARENT_HEIGHT_PX,
  PARENT_WIDTH_PX,
  PARENT_X_PX,
  PARENT_Y_PX,
} from "./constants";

const TARGET_DESCRIPTION: HostTargetDescription = {
  name: "Fixture",
  role: null,
  label: null,
  testId: "fixture",
};

const createHandle = (bounds: HostBounds): NativeHostHandle => ({
  measureInWindow: (callback) => {
    callback(bounds.x, bounds.y, bounds.width, bounds.height);
  },
});

const PARENT_BOUNDS: HostBounds = {
  x: PARENT_X_PX,
  y: PARENT_Y_PX,
  width: PARENT_WIDTH_PX,
  height: PARENT_HEIGHT_PX,
};

const CHILD_BOUNDS: HostBounds = {
  x: CHILD_X_PX,
  y: CHILD_Y_PX,
  width: CHILD_WIDTH_PX,
  height: CHILD_HEIGHT_PX,
};

describe("native target registry", () => {
  it("hit-tests registered native handles without React metadata", async () => {
    const registry = createNativeTargetRegistry();
    registry.register({
      id: "parent",
      handle: createHandle(PARENT_BOUNDS),
      description: TARGET_DESCRIPTION,
    });
    registry.register({
      id: "child",
      handle: createHandle(CHILD_BOUNDS),
      description: TARGET_DESCRIPTION,
      parentId: "parent",
    });

    const target = await registry.adapter.getTargetAtPoint({ x: HIT_X_PX, y: HIT_Y_PX });
    expect(target?.id).toBe("child");
    expect(target?.capabilities.getReactMetadata).toBeUndefined();
  });

  it("resolves registered hierarchy through opaque targets", async () => {
    const registry = createNativeTargetRegistry();
    registry.register({
      id: "parent",
      handle: createHandle(PARENT_BOUNDS),
      description: TARGET_DESCRIPTION,
    });
    registry.register({
      id: "child",
      handle: createHandle(CHILD_BOUNDS),
      description: TARGET_DESCRIPTION,
      parentId: "parent",
    });
    const parentTarget = registry.getTarget("parent");
    const childTarget = registry.getTarget("child");

    await expect(childTarget?.capabilities.getParent?.()).resolves.toBe(parentTarget);
    await expect(parentTarget?.capabilities.getChildren?.()).resolves.toEqual([childTarget]);
  });

  it("invalidates a target only when its current registration unmounts", async () => {
    const registry = createNativeTargetRegistry();
    const firstRegistration = registry.register({
      id: "fixture",
      handle: createHandle(PARENT_BOUNDS),
      description: TARGET_DESCRIPTION,
    });
    const target = registry.getTarget("fixture");
    const currentRegistration = registry.register({
      id: "fixture",
      handle: createHandle(CHILD_BOUNDS),
      description: TARGET_DESCRIPTION,
    });

    firstRegistration.unregister();
    await expect(target?.capabilities.resolve()).resolves.toBe(target);
    currentRegistration.unregister();
    await expect(target?.capabilities.resolve()).resolves.toBeNull();
  });

  it("restores the previous registration when a duplicate unmounts", async () => {
    const registry = createNativeTargetRegistry();
    registry.register({
      id: "fixture",
      handle: createHandle(PARENT_BOUNDS),
      description: TARGET_DESCRIPTION,
    });
    const target = registry.getTarget("fixture");
    const currentDescription: HostTargetDescription = {
      ...TARGET_DESCRIPTION,
      label: "current",
    };
    const currentRegistration = registry.register({
      id: "fixture",
      handle: createHandle(CHILD_BOUNDS),
      description: currentDescription,
    });

    await expect(target?.capabilities.measure()).resolves.toEqual(CHILD_BOUNDS);
    await expect(target?.capabilities.describe()).resolves.toBe(currentDescription);
    await expect(
      registry.adapter.getTargetAtPoint({ x: PARENT_X_PX, y: PARENT_Y_PX }),
    ).resolves.toBeNull();

    currentRegistration.unregister();

    await expect(target?.capabilities.resolve()).resolves.toBe(target);
    await expect(target?.capabilities.measure()).resolves.toEqual(PARENT_BOUNDS);
    await expect(target?.capabilities.describe()).resolves.toBe(TARGET_DESCRIPTION);
    await expect(
      registry.adapter.getTargetAtPoint({ x: PARENT_X_PX, y: PARENT_Y_PX }),
    ).resolves.toBe(target);
  });

  it("keeps overlap order stable when registration metadata changes", async () => {
    const registry = createNativeTargetRegistry();
    const firstRegistration = registry.register({
      id: "first",
      handle: createHandle(PARENT_BOUNDS),
      description: TARGET_DESCRIPTION,
    });
    registry.register({
      id: "second",
      handle: createHandle(PARENT_BOUNDS),
      description: TARGET_DESCRIPTION,
    });

    firstRegistration.update({
      description: {
        ...TARGET_DESCRIPTION,
        label: "updated",
      },
    });

    await expect(
      registry.adapter.getTargetAtPoint({ x: HIT_X_PX, y: HIT_Y_PX }),
    ).resolves.toMatchObject({ id: "second" });
  });

  it("prefers native stacking priority over registration order", async () => {
    const registry = createNativeTargetRegistry();
    registry.register({
      id: "front",
      handle: createHandle(PARENT_BOUNDS),
      description: TARGET_DESCRIPTION,
      priority: 1,
    });
    registry.register({
      id: "back",
      handle: createHandle(PARENT_BOUNDS),
      description: TARGET_DESCRIPTION,
    });

    await expect(
      registry.adapter.getTargetAtPoint({ x: HIT_X_PX, y: HIT_Y_PX }),
    ).resolves.toMatchObject({ id: "front" });
  });
});

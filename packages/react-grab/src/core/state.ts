import { createSignal, createMemo } from "solid-js";
import type { Theme, DeepPartial, GrabbedBox } from "../types.js";
import { DEFAULT_THEME, deepMergeTheme } from "./theme.js";

interface Position {
  x: number;
  y: number;
}

interface GrabStateIdle {
  state: "idle";
}

interface GrabStateHolding {
  state: "holding";
  startedAt: number;
}

interface GrabStateActive {
  state: "active";
  pointer: Position;
  hoveredEl: Element | null;
  lockedEl: Element | null;
}

interface GrabStateCopying {
  state: "copying";
  elements: Element[];
  startedAt: number;
}

type GrabState = GrabStateIdle | GrabStateHolding | GrabStateActive | GrabStateCopying;

interface GrabConfig {
  holdThreshold: number;
  copyFeedbackDelay: number;
  elementFilter?: (el: Element) => boolean;
  getContent?: (elements: Element[]) => Promise<string> | string;
  maxContextLines?: number;
}

const [grab, setGrab] = createSignal<GrabState>({ state: "idle" });

const [config, setConfig] = createSignal<GrabConfig>({
  holdThreshold: 200,
  copyFeedbackDelay: 1500,
});

const [theme, setThemeSignal] = createSignal<Required<Theme>>(DEFAULT_THEME);

const [grabbedBoxes, setGrabbedBoxes] = createSignal<GrabbedBox[]>([]);

const isActive = createMemo(() => {
  const state = grab();
  return state.state === "active" || state.state === "copying";
});

const isCopying = createMemo(() => grab().state === "copying");

const isHolding = createMemo(() => grab().state === "holding");

const targetEl = createMemo(() => {
  const state = grab();
  if (state.state === "active") {
    return state.lockedEl ?? state.hoveredEl;
  }
  return null;
});

const pointer = createMemo(() => {
  const state = grab();
  if (state.state === "active") {
    return state.pointer;
  }
  return null;
});

const updateTheme = (partialTheme: DeepPartial<Theme>) => {
  setThemeSignal((prev) => deepMergeTheme(prev, partialTheme));
};

const addGrabbedBox = (box: GrabbedBox) => {
  setGrabbedBoxes((prev) => [...prev, box]);
};

const removeGrabbedBox = (id: string) => {
  setGrabbedBoxes((prev) => prev.filter((box) => box.id !== id));
};

export {
  grab,
  setGrab,
  config,
  setConfig,
  theme,
  updateTheme,
  grabbedBoxes,
  addGrabbedBox,
  removeGrabbedBox,
  isActive,
  isCopying,
  isHolding,
  targetEl,
  pointer,
};

export type { GrabState, GrabConfig, Position };

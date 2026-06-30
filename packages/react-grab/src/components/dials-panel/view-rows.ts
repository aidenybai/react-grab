import {
  DIAL_SPRING_BOUNCE_MAX,
  DIAL_SPRING_BOUNCE_MIN,
  DIAL_SPRING_DEFAULT_BOUNCE,
  DIAL_SPRING_DEFAULT_VISUAL_DURATION_S,
  DIAL_SPRING_VISUAL_DURATION_MAX_S,
  DIAL_SPRING_VISUAL_DURATION_MIN_S,
} from "../../constants.js";
import type { DialControl, DialPanelRuntime, DialValue, SpringValue } from "../../types.js";
import { clampToRange } from "../../utils/clamp-to-range.js";

interface DialViewHandlers {
  getValue: (panelId: string, path: string) => DialValue;
  commit: (panelId: string, path: string, value: DialValue) => void;
  triggerAction: (panelId: string, path: string) => void;
  isCollapsed: (key: string, defaultCollapsed: boolean) => boolean;
  setCollapsed: (key: string, collapsed: boolean) => void;
}

interface DialNavEntry {
  adjust: (direction: 1 | -1, large: boolean) => void;
  activate: () => void;
}

interface DialTitleRow {
  type: "title";
  key: string;
  name: string;
  showDivider: boolean;
  collapsible: boolean;
  collapsed: boolean;
  navIndex: number;
}

interface DialFolderRow {
  type: "folder";
  key: string;
  navIndex: number;
  depth: number;
  label: string;
  collapsed: boolean;
}

interface DialLeafRow {
  type: "leaf";
  key: string;
  navIndex: number;
  depth: number;
  panelId: string;
  control: DialControl;
}

interface DialSpringVizRow {
  type: "spring-viz";
  key: string;
  depth: number;
  panelId: string;
  springPath: string;
}

interface DialSpringFieldRow {
  type: "spring-field";
  key: string;
  navIndex: number;
  depth: number;
  panelId: string;
  springPath: string;
  field: "visualDuration" | "bounce";
  label: string;
  min: number;
  max: number;
  step: number;
}

type DialViewRow =
  | DialTitleRow
  | DialFolderRow
  | DialLeafRow
  | DialSpringVizRow
  | DialSpringFieldRow;

interface DialViewModel {
  rows: DialViewRow[];
  navEntries: DialNavEntry[];
}

const SPRING_FIELD_STEP = 0.05;
const SPRING_FIELDS: ReadonlyArray<{
  field: "visualDuration" | "bounce";
  label: string;
  min: number;
  max: number;
}> = [
  {
    field: "visualDuration",
    label: "Duration",
    min: DIAL_SPRING_VISUAL_DURATION_MIN_S,
    max: DIAL_SPRING_VISUAL_DURATION_MAX_S,
  },
  { field: "bounce", label: "Bounce", min: DIAL_SPRING_BOUNCE_MIN, max: DIAL_SPRING_BOUNCE_MAX },
];

const stepDecimals = (step: number): number => {
  if (step >= 1) return 0;
  const fraction = String(step).split(".")[1];
  return fraction ? Math.min(6, fraction.length) : 2;
};

export const readSpring = (raw: DialValue): SpringValue =>
  typeof raw === "object"
    ? raw
    : {
        type: "spring",
        visualDuration: DIAL_SPRING_DEFAULT_VISUAL_DURATION_S,
        bounce: DIAL_SPRING_DEFAULT_BOUNCE,
      };

export const buildDialViewModel = (
  panels: DialPanelRuntime[],
  handlers: DialViewHandlers,
  query = "",
): DialViewModel => {
  const normalizedQuery = query.trim().toLowerCase();
  const rows: DialViewRow[] = [];
  const navEntries: DialNavEntry[] = [];

  const pushNav = (entry: DialNavEntry): number => {
    navEntries.push(entry);
    return navEntries.length - 1;
  };

  const pushCollapsibleHeader = (
    panelId: string,
    path: string,
    label: string,
    depth: number,
    defaultCollapsed: boolean,
  ): boolean => {
    const key = `${panelId}::${path}`;
    const collapsed = handlers.isCollapsed(key, defaultCollapsed);
    rows.push({
      type: "folder",
      key,
      navIndex: pushNav({
        adjust: (direction) => handlers.setCollapsed(key, direction < 0),
        activate: () => handlers.setCollapsed(key, !collapsed),
      }),
      depth,
      label,
      collapsed,
    });
    return collapsed;
  };

  const emitSpringRows = (panelId: string, springPath: string, depth: number) => {
    rows.push({
      type: "spring-viz",
      key: `${panelId}::${springPath}::viz`,
      depth,
      panelId,
      springPath,
    });
    for (const fieldConfig of SPRING_FIELDS) {
      rows.push({
        type: "spring-field",
        key: `${panelId}::${springPath}::${fieldConfig.field}`,
        navIndex: pushNav({
          adjust: (direction, large) => {
            const spring = readSpring(handlers.getValue(panelId, springPath));
            const stepAmount = SPRING_FIELD_STEP * (large ? 4 : 1);
            const next = Number(
              clampToRange(
                spring[fieldConfig.field] + direction * stepAmount,
                fieldConfig.min,
                fieldConfig.max,
              ).toFixed(stepDecimals(SPRING_FIELD_STEP)),
            );
            if (next !== spring[fieldConfig.field]) {
              handlers.commit(panelId, springPath, { ...spring, [fieldConfig.field]: next });
            }
          },
          activate: () => {},
        }),
        depth,
        panelId,
        springPath,
        field: fieldConfig.field,
        label: fieldConfig.label,
        min: fieldConfig.min,
        max: fieldConfig.max,
        step: SPRING_FIELD_STEP,
      });
    }
  };

  const emitLeaf = (panelId: string, control: DialControl, depth: number) => {
    rows.push({
      type: "leaf",
      key: `${panelId}::${control.path}`,
      navIndex: pushNav(buildLeafNavEntry(panelId, control, handlers)),
      depth,
      panelId,
      control,
    });
  };

  const walk = (panelId: string, controls: DialControl[], depth: number) => {
    for (const control of controls) {
      if (control.kind === "folder") {
        const collapsed = pushCollapsibleHeader(
          panelId,
          control.path,
          control.label,
          depth,
          control.collapsed,
        );
        if (!collapsed) walk(panelId, control.children, depth + 1);
        continue;
      }

      if (control.kind === "spring") {
        const collapsed = pushCollapsibleHeader(panelId, control.path, control.label, depth, false);
        if (!collapsed) emitSpringRows(panelId, control.path, depth + 1);
        continue;
      }

      emitLeaf(panelId, control, depth);
    }
  };

  const collectMatching = (controls: DialControl[], out: DialControl[]) => {
    for (const control of controls) {
      if (control.kind === "folder") {
        collectMatching(control.children, out);
        continue;
      }
      if (control.label.toLowerCase().includes(normalizedQuery)) out.push(control);
    }
  };

  // A single panel needs no name - the whole panel IS that one set of dials.
  // With multiple panels, each name becomes a collapsible group header so the
  // sources stay visually distinct and individually foldable.
  const showPanelHeaders = panels.length > 1;

  const pushPanelHeader = (panel: DialPanelRuntime, showDivider: boolean, collapsible: boolean) => {
    const key = `${panel.id}::group`;
    const collapsed = collapsible && handlers.isCollapsed(key, false);
    rows.push({
      type: "title",
      key,
      name: panel.name,
      showDivider,
      collapsible,
      collapsed,
      navIndex: collapsible
        ? pushNav({
            adjust: (direction) => handlers.setCollapsed(key, direction < 0),
            activate: () => handlers.setCollapsed(key, !collapsed),
          })
        : -1,
    });
    return collapsed;
  };

  let renderedPanelCount = 0;
  for (const panel of panels) {
    if (normalizedQuery) {
      const matched: DialControl[] = [];
      collectMatching(panel.controls, matched);
      if (matched.length === 0) continue;
      if (showPanelHeaders) pushPanelHeader(panel, renderedPanelCount > 0, false);
      for (const control of matched) {
        if (control.kind === "spring") {
          const collapsed = pushCollapsibleHeader(panel.id, control.path, control.label, 0, false);
          if (!collapsed) emitSpringRows(panel.id, control.path, 0);
        } else {
          emitLeaf(panel.id, control, 0);
        }
      }
    } else {
      if (showPanelHeaders && pushPanelHeader(panel, renderedPanelCount > 0, true)) {
        renderedPanelCount += 1;
        continue;
      }
      walk(panel.id, panel.controls, 0);
    }
    renderedPanelCount += 1;
  }

  return { rows, navEntries };
};

const buildLeafNavEntry = (
  panelId: string,
  control: DialControl,
  handlers: DialViewHandlers,
): DialNavEntry => {
  const path = control.path;
  if (control.kind === "number") {
    return {
      adjust: (direction, large) => {
        const current = handlers.getValue(panelId, path);
        const value = typeof current === "number" ? current : control.default;
        const stepAmount = control.step * (large ? 10 : 1);
        const next = Number(
          clampToRange(value + direction * stepAmount, control.min, control.max).toFixed(
            stepDecimals(control.step),
          ),
        );
        if (next !== value) handlers.commit(panelId, path, next);
      },
      activate: () => {},
    };
  }
  if (control.kind === "select") {
    const cycle = (direction: 1 | -1) => {
      if (control.options.length === 0) return;
      const current = handlers.getValue(panelId, path);
      const value = typeof current === "string" ? current : control.default;
      const currentIndex = control.options.findIndex((option) => option.value === value);
      const nextIndex =
        (currentIndex + direction + control.options.length) % control.options.length;
      handlers.commit(panelId, path, control.options[nextIndex].value);
    };
    return { adjust: (direction) => cycle(direction), activate: () => cycle(1) };
  }
  if (control.kind === "toggle") {
    return {
      adjust: (direction) => handlers.commit(panelId, path, direction > 0),
      activate: () => {
        const current = handlers.getValue(panelId, path);
        const value = typeof current === "boolean" ? current : control.default;
        handlers.commit(panelId, path, !value);
      },
    };
  }
  if (control.kind === "action") {
    return { adjust: () => {}, activate: () => handlers.triggerAction(panelId, path) };
  }
  return { adjust: () => {}, activate: () => {} };
};

export type { DialNavEntry, DialViewRow };

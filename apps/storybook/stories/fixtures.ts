import type { CommentItem, ContextMenuAction } from "react-grab/src/types.js";
import { noop } from "./noop.js";

export type CommentPreset =
  | "empty"
  | "single"
  | "multiple"
  | "annotated"
  | "long-names"
  | "many"
  | "tag-only";

export const COMMENT_PRESET_KEYS: readonly CommentPreset[] = [
  "empty",
  "single",
  "multiple",
  "annotated",
  "long-names",
  "many",
  "tag-only",
] as const;

export const createMenuActions = (openEnabled: boolean): ContextMenuAction[] => [
  { id: "copy", label: "Copy", shortcut: "C", onAction: noop },
  { id: "copy-html", label: "Copy HTML", onAction: noop },
  { id: "open", label: "Open", shortcut: "O", enabled: openEnabled, onAction: noop },
  { id: "comment", label: "Comment", shortcut: "Enter", onAction: noop },
];

export const getItemPresets = (): Record<CommentPreset, CommentItem[]> => {
  const now = Date.now();
  return {
    empty: [],
    single: [
      {
        id: "c1",
        content: "<Button />",
        elementName: "Button",
        tagName: "button",
        componentName: "Button",
        commentText: "",
        timestamp: now - 30_000,
      },
    ],
    multiple: [
      {
        id: "c1",
        content: "<Header />",
        elementName: "Header",
        tagName: "header",
        componentName: "Header",
        commentText: "",
        timestamp: now - 15_000,
      },
      {
        id: "c2",
        content: "<Navigation />",
        elementName: "Navigation",
        tagName: "nav",
        componentName: "Navigation",
        commentText: "",
        timestamp: now - 120_000,
      },
      {
        id: "c3",
        content: "<Footer />",
        elementName: "Footer",
        tagName: "footer",
        componentName: "Footer",
        commentText: "",
        timestamp: now - 3_600_000,
      },
    ],
    annotated: [
      {
        id: "c1",
        content: "<Card />",
        elementName: "Card",
        tagName: "div",
        componentName: "Card",
        commentText: "make it bigger",
        timestamp: now - 7_500,
      },
      {
        id: "c2",
        content: "<Sidebar />",
        elementName: "Sidebar",
        tagName: "aside",
        componentName: "Sidebar",
        commentText: "add dark mode support",
        timestamp: now - 300_000,
      },
      {
        id: "c3",
        content: "<Button />",
        elementName: "Button",
        tagName: "button",
        componentName: "Button",
        commentText: "",
        timestamp: now - 7_200_000,
      },
    ],
    "long-names": [
      {
        id: "c1",
        content: "<InteractiveDataVisualizationChart />",
        elementName: "InteractiveDataVisualizationChart",
        tagName: "div",
        componentName: "InteractiveDataVisualizationChart",
        commentText: "add tooltips on hover with data values and percentage",
        timestamp: now - 5_000,
      },
      {
        id: "c2",
        content: "<SuperLongComponentNameWrapper />",
        elementName: "SuperLongComponentNameWrapper",
        tagName: "custom-interactive-element",
        componentName: "SuperLongComponentNameWrapper",
        commentText: "",
        timestamp: now - 86_400_000,
      },
    ],
    "tag-only": [
      {
        id: "c1",
        content: "<section />",
        elementName: "section",
        tagName: "section",
        commentText: "",
        timestamp: now - 60_000,
      },
      {
        id: "c2",
        content: "<div />",
        elementName: "div",
        tagName: "div",
        commentText: "",
        timestamp: now - 180_000,
      },
    ],
    many: [
      {
        id: "c1",
        content: "<Header />",
        elementName: "Header",
        tagName: "header",
        componentName: "Header",
        commentText: "",
        timestamp: now - 7_500,
      },
      {
        id: "c2",
        content: "<Navigation />",
        elementName: "Navigation",
        tagName: "nav",
        componentName: "Navigation",
        commentText: "make it sticky",
        timestamp: now - 60_000,
      },
      {
        id: "c3",
        content: "<Card />",
        elementName: "Card",
        tagName: "div",
        componentName: "Card",
        commentText: "",
        timestamp: now - 300_000,
      },
      {
        id: "c4",
        content: "<Button />",
        elementName: "Button",
        tagName: "button",
        componentName: "Button",
        commentText: "increase padding",
        timestamp: now - 600_000,
      },
      {
        id: "c5",
        content: "<Footer />",
        elementName: "Footer",
        tagName: "footer",
        componentName: "Footer",
        commentText: "",
        timestamp: now - 1_800_000,
      },
      {
        id: "c6",
        content: "<Sidebar />",
        elementName: "Sidebar",
        tagName: "aside",
        componentName: "Sidebar",
        commentText: "",
        timestamp: now - 3_600_000,
      },
      {
        id: "c7",
        content: "<Modal />",
        elementName: "Modal",
        tagName: "dialog",
        componentName: "Modal",
        commentText: "add animation",
        timestamp: now - 7_200_000,
      },
      {
        id: "c8",
        content: "<Form />",
        elementName: "Form",
        tagName: "form",
        componentName: "Form",
        commentText: "",
        timestamp: now - 43_200_000,
      },
    ],
  };
};

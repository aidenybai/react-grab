import { createEffect, createSignal, on, onCleanup, onMount } from "solid-js";
import type { Meta, StoryContext, StoryObj } from "storybook-solidjs-vite";
import { ReactGrabRenderer } from "react-grab/src/components/renderer.js";
import type { OverlayBounds } from "react-grab/src/types.js";
import { assertMounted, assertNotMounted } from "./assertions.js";
import { COMMENT_PRESET_KEYS, createMenuActions, getItemPresets } from "./fixtures.js";
import type { CommentPreset } from "./fixtures.js";
import { noop } from "./noop.js";
import { SampleDashboard } from "./sample-dashboard.js";

const ELEMENT_KEYS = [
  "none",
  "header",
  "logo",
  "nav-home",
  "nav-about",
  "card-welcome",
  "card-settings",
  "btn-start",
  "btn-save",
  "input",
  "footer",
] as const;

type ElementKey = (typeof ELEMENT_KEYS)[number];

const isElementKey = (value: string | undefined): value is ElementKey => {
  if (value === undefined) return false;
  for (const candidate of ELEMENT_KEYS) {
    if (candidate === value) return true;
  }
  return false;
};

const measureElement = (element: HTMLElement | undefined): OverlayBounds | undefined => {
  if (!element) return undefined;
  const rect = element.getBoundingClientRect();
  const borderRadius = getComputedStyle(element).borderRadius || "0px";
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    borderRadius,
    transform: "",
  };
};

interface SceneProps {
  selectedElement: ElementKey;
  showToolbar: boolean;
  isActive: boolean;
  enabled: boolean;
  isPromptMode: boolean;
  isPendingDismiss: boolean;
  showContextMenu: boolean;
  inputValue: string;
  filePath: string;
  commentPreset: CommentPreset;
}

const Scene = (props: SceneProps) => {
  const elementRefs: Partial<Record<ElementKey, HTMLElement>> = {};
  const [selectionBounds, setSelectionBounds] = createSignal<OverlayBounds | undefined>(undefined);

  const captureRef = (element: HTMLElement | undefined): void => {
    if (!element) return;
    const key = element.dataset.storyId;
    if (!isElementKey(key)) return;
    elementRefs[key] = element;
  };

  const recompute = () => {
    const key = props.selectedElement;
    if (key === "none") {
      setSelectionBounds(undefined);
      return;
    }
    setSelectionBounds(measureElement(elementRefs[key]));
  };

  let pendingFrameHandle: number | null = null;
  const scheduleRecompute = () => {
    if (pendingFrameHandle !== null) cancelAnimationFrame(pendingFrameHandle);
    pendingFrameHandle = requestAnimationFrame(() => {
      pendingFrameHandle = null;
      recompute();
    });
  };

  onMount(() => {
    recompute();
    window.addEventListener("resize", recompute);
    onCleanup(() => {
      window.removeEventListener("resize", recompute);
      if (pendingFrameHandle !== null) cancelAnimationFrame(pendingFrameHandle);
    });
  });

  createEffect(on(() => props.selectedElement, scheduleRecompute, { defer: true }));

  const elementMeta = () => {
    const element = elementRefs[props.selectedElement];
    if (!element) return { tagName: "", componentName: "" };
    return {
      tagName: element.tagName.toLowerCase(),
      componentName: element.dataset.component ?? "",
    };
  };

  const hasSelection = (): boolean => props.selectedElement !== "none" && selectionBounds() != null;

  const mouseX = (): number => {
    const bounds = selectionBounds();
    return bounds ? bounds.x + bounds.width / 2 : 0;
  };

  const contextMenuPosition = () => {
    if (!props.showContextMenu) return null;
    const bounds = selectionBounds();
    if (!bounds) return null;
    return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height + 4 };
  };

  const commentItems = () => getItemPresets()[props.commentPreset] ?? [];

  return (
    <>
      <SampleDashboard captureRef={captureRef} />
      <ReactGrabRenderer
        selectionVisible={hasSelection()}
        selectionBounds={selectionBounds()}
        selectionShouldSnap={false}
        selectionLabelVisible={hasSelection()}
        selectionLabelStatus="idle"
        selectionTagName={elementMeta().tagName}
        selectionComponentName={elementMeta().componentName}
        selectionFilePath={props.filePath || undefined}
        mouseX={mouseX()}
        isPromptMode={props.isPromptMode}
        inputValue={props.inputValue}
        isPendingDismiss={props.isPendingDismiss}
        isFrozen={false}
        toolbarVisible={props.showToolbar}
        isActive={props.isActive}
        enabled={props.enabled}
        commentItems={commentItems()}
        commentItemCount={commentItems().length}
        contextMenuPosition={contextMenuPosition()}
        contextMenuBounds={props.showContextMenu ? selectionBounds() : null}
        contextMenuTagName={elementMeta().tagName}
        contextMenuComponentName={elementMeta().componentName}
        contextMenuHasFilePath={Boolean(props.filePath)}
        actions={createMenuActions(Boolean(props.filePath))}
        onInputChange={noop}
        onInputSubmit={noop}
        onToggleExpand={noop}
        onConfirmDismiss={noop}
        onCancelDismiss={noop}
        onToggleActive={noop}
        onToolbarStateChange={noop}
        onToggleComments={noop}
        onCopyAll={noop}
        onContextMenuDismiss={noop}
        onContextMenuHide={noop}
      />
    </>
  );
};

const meta: Meta<SceneProps> = {
  title: "Playground",
  render: (args) => <Scene {...args} />,
  play: async ({ canvasElement, args }) => {
    const selector = "[data-react-grab-selection-label]";
    if (args.selectedElement === "none") {
      await assertNotMounted(canvasElement, selector);
    } else {
      await assertMounted(canvasElement, selector);
    }
    if (args.showToolbar) {
      await assertMounted(canvasElement, "[data-react-grab-toolbar]");
    }
  },
  args: {
    selectedElement: "btn-start",
    showToolbar: true,
    isActive: true,
    enabled: true,
    isPromptMode: false,
    isPendingDismiss: false,
    showContextMenu: false,
    inputValue: "",
    filePath: "",
    commentPreset: "empty",
  },
  argTypes: {
    selectedElement: { control: "select", options: ELEMENT_KEYS },
    showToolbar: { control: "boolean" },
    isActive: { control: "boolean" },
    enabled: { control: "boolean" },
    isPromptMode: { control: "boolean" },
    isPendingDismiss: { control: "boolean" },
    showContextMenu: { control: "boolean" },
    inputValue: { control: "text" },
    filePath: { control: "text" },
    commentPreset: { control: "select", options: COMMENT_PRESET_KEYS },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: { selectedElement: "btn-start" },
};

export const ContextMenu: Story = {
  args: {
    selectedElement: "btn-start",
    showContextMenu: true,
    filePath: "src/components/Button.tsx",
  },
  play: async (context: StoryContext<SceneProps>) => {
    if (!meta.play) throw new Error("meta.play is required for shared assertions");
    await meta.play(context);
    await assertMounted(context.canvasElement, "[data-react-grab-context-menu]");
  },
};

export const CommentInput: Story = {
  args: { selectedElement: "btn-save", isPromptMode: true, inputValue: "" },
};

export const CommentWithText: Story = {
  args: { selectedElement: "card-welcome", isPromptMode: true, inputValue: "make it bigger" },
};

export const PendingDismiss: Story = {
  args: { selectedElement: "btn-save", isPromptMode: true, isPendingDismiss: true },
};

export const WithComments: Story = {
  args: { selectedElement: "header", commentPreset: "annotated" },
};

export const NoSelection: Story = {
  args: { selectedElement: "none" },
};

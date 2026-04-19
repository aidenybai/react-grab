import { createEffect, createSignal, on, onCleanup, onMount } from "solid-js";
import type { Meta, StoryContext, StoryObj } from "storybook-solidjs-vite";
import { expect, waitFor } from "storybook/test";
import { ReactGrabRenderer } from "react-grab/src/components/renderer.js";
import type { OverlayBounds } from "react-grab/src/types.js";
import { COMMENT_PRESET_KEYS, createMenuActions, getItemPresets } from "./fixtures.js";
import type { CommentPreset } from "./fixtures.js";
import { noop } from "./noop.js";

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

interface ElementMeta {
  tagName: string;
  componentName: string;
}

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

  const isElementKey = (value: string | undefined): value is ElementKey => {
    if (value === undefined) return false;
    for (const candidate of ELEMENT_KEYS) {
      if (candidate === value) return true;
    }
    return false;
  };

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

  const elementMeta = (): ElementMeta => {
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
    <div
      style={{
        "min-height": "100vh",
        background: "#fafafa",
        "font-family": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "#1a1a1a",
      }}
    >
      <header
        ref={captureRef}
        data-story-id="header"
        data-component="AppHeader"
        style={{
          display: "flex",
          "align-items": "center",
          "justify-content": "space-between",
          padding: "16px 32px",
          background: "#fff",
          "border-bottom": "1px solid #e5e5e5",
        }}
      >
        <h1
          ref={captureRef}
          data-story-id="logo"
          data-component="Logo"
          style={{
            "font-size": "18px",
            "font-weight": 700,
            margin: 0,
            "letter-spacing": "-0.02em",
          }}
        >
          Acme Dashboard
        </h1>
        <nav style={{ display: "flex", gap: "24px", "font-size": "14px" }}>
          <a
            ref={captureRef}
            data-story-id="nav-home"
            data-component="NavLink"
            href="#"
            style={{ color: "#1a1a1a", "text-decoration": "none", "font-weight": 500 }}
          >
            Home
          </a>
          <a
            ref={captureRef}
            data-story-id="nav-about"
            data-component="NavLink"
            href="#"
            style={{ color: "#666", "text-decoration": "none" }}
          >
            About
          </a>
        </nav>
      </header>

      <main
        style={{
          display: "grid",
          "grid-template-columns": "1fr 1fr",
          gap: "24px",
          padding: "32px",
          "max-width": "880px",
          margin: "0 auto",
        }}
      >
        <div
          ref={captureRef}
          data-story-id="card-welcome"
          data-component="WelcomeCard"
          style={{
            background: "#fff",
            "border-radius": "12px",
            padding: "24px",
            "box-shadow": "0 1px 3px rgba(0,0,0,0.08)",
            border: "1px solid #e5e5e5",
          }}
        >
          <h2 style={{ "font-size": "16px", "font-weight": 600, margin: "0 0 8px" }}>Welcome</h2>
          <p
            style={{
              "font-size": "14px",
              color: "#666",
              margin: "0 0 20px",
              "line-height": 1.5,
            }}
          >
            This is a sample dashboard. Select any element using the controls below to see React
            Grab's overlay.
          </p>
          <button
            ref={captureRef}
            data-story-id="btn-start"
            data-component="Button"
            style={{
              padding: "8px 16px",
              background: "#1a1a1a",
              color: "#fff",
              border: "none",
              "border-radius": "8px",
              "font-size": "14px",
              "font-weight": 500,
              cursor: "pointer",
            }}
          >
            Get Started
          </button>
        </div>

        <div
          ref={captureRef}
          data-story-id="card-settings"
          data-component="SettingsCard"
          style={{
            background: "#fff",
            "border-radius": "12px",
            padding: "24px",
            "box-shadow": "0 1px 3px rgba(0,0,0,0.08)",
            border: "1px solid #e5e5e5",
          }}
        >
          <h2 style={{ "font-size": "16px", "font-weight": 600, margin: "0 0 8px" }}>Settings</h2>
          <label
            style={{
              "font-size": "13px",
              color: "#666",
              display: "block",
              "margin-bottom": "6px",
            }}
          >
            Display name
          </label>
          <input
            ref={captureRef}
            data-story-id="input"
            data-component="TextField"
            type="text"
            placeholder="Your name"
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d4d4d4",
              "border-radius": "8px",
              "font-size": "14px",
              "margin-bottom": "16px",
              "box-sizing": "border-box",
              outline: "none",
            }}
          />
          <button
            ref={captureRef}
            data-story-id="btn-save"
            data-component="Button"
            style={{
              padding: "8px 16px",
              background: "#fff",
              color: "#1a1a1a",
              border: "1px solid #d4d4d4",
              "border-radius": "8px",
              "font-size": "14px",
              "font-weight": 500,
              cursor: "pointer",
            }}
          >
            Save Changes
          </button>
        </div>
      </main>

      <footer
        ref={captureRef}
        data-story-id="footer"
        data-component="Footer"
        style={{
          padding: "24px 32px",
          "text-align": "center",
          "font-size": "13px",
          color: "#999",
          "border-top": "1px solid #e5e5e5",
          "margin-top": "48px",
        }}
      >
        © 2025 Acme Inc. All rights reserved.
      </footer>

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
    </div>
  );
};

const meta: Meta<SceneProps> = {
  title: "Playground",
  render: (args) => <Scene {...args} />,
  play: async ({ canvasElement, args }) => {
    const selectionLabel = () => canvasElement.querySelector("[data-react-grab-selection-label]");
    const toolbar = () => canvasElement.querySelector("[data-react-grab-toolbar]");

    await waitFor(() => {
      if (args.selectedElement === "none") {
        expect(selectionLabel()).toBeNull();
      } else {
        expect(selectionLabel()).not.toBeNull();
      }
      if (args.showToolbar) {
        expect(toolbar()).not.toBeNull();
      }
    });
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
    await waitFor(() => {
      expect(context.canvasElement.querySelector("[data-react-grab-context-menu]")).not.toBeNull();
    });
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

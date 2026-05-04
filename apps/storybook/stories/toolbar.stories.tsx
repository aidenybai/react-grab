import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { expect, waitFor } from "storybook/test";
import { Toolbar } from "react-grab/src/components/toolbar/index.js";
import { Canvas } from "./target-box.js";
import { noop } from "./noop.js";

interface ToolbarSceneProps {
  isActive: boolean;
  enabled: boolean;
  commentItemCount: number;
  isContextMenuOpen: boolean;
  collapsed: boolean;
}

const TOOLBAR_STATE_KEY = "react-grab-toolbar-state";

const seedToolbarState = (args: ToolbarSceneProps): void => {
  if (typeof localStorage === "undefined") return;
  // Collapsed pills snap flush to the viewport edge (no margin), which
  // clips the unread-comments badge's negative top offset. Using the
  // bottom edge for collapsed states lets the badge hang upward into
  // the viewport instead of being cut off above it.
  const edge = args.collapsed ? "bottom" : "top";
  localStorage.setItem(
    TOOLBAR_STATE_KEY,
    JSON.stringify({
      edge,
      ratio: 0.5,
      collapsed: args.collapsed,
      enabled: !args.collapsed,
    }),
  );
};

const meta: Meta<ToolbarSceneProps> = {
  title: "Components/Toolbar",
  render: (args) => (
    <Canvas>
      <Toolbar
        isActive={args.isActive}
        enabled={args.enabled}
        isContextMenuOpen={args.isContextMenuOpen}
        commentItemCount={args.commentItemCount}
        onToggle={noop}
        onStateChange={noop}
        onSelectHoverChange={noop}
        onToggleComments={noop}
        onCopyAll={noop}
        onCopyAllHover={noop}
        onCommentsButtonHover={noop}
        onToggleToolbarMenu={noop}
      />
    </Canvas>
  ),
  beforeEach: async ({ args }) => {
    seedToolbarState(args);
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector("[data-react-grab-toolbar]")).not.toBeNull();
    });
  },
  args: {
    isActive: false,
    enabled: true,
    isContextMenuOpen: false,
    commentItemCount: 0,
    collapsed: false,
  },
  argTypes: {
    isActive: { control: "boolean" },
    enabled: { control: "boolean" },
    isContextMenuOpen: { control: "boolean" },
    commentItemCount: { control: { type: "number", min: 0, max: 99 } },
    collapsed: { control: "boolean" },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { isActive: false, enabled: true, commentItemCount: 0 },
};

export const Active: Story = {
  args: { isActive: true, enabled: true, commentItemCount: 0 },
};

export const Collapsed: Story = {
  args: { isActive: false, enabled: false, commentItemCount: 0, collapsed: true },
};

export const CollapsedWithComments: Story = {
  args: { isActive: false, enabled: false, commentItemCount: 3, collapsed: true },
};

export const Disabled: Story = {
  args: { isActive: false, enabled: false, commentItemCount: 0 },
};

export const ActiveDisabled: Story = {
  args: { isActive: true, enabled: false, commentItemCount: 0 },
};

export const ContextMenuOpen: Story = {
  args: { isActive: true, enabled: true, commentItemCount: 0, isContextMenuOpen: true },
};

export const WithComments: Story = {
  args: { isActive: true, enabled: true, commentItemCount: 3 },
};

export const WithManyComments: Story = {
  args: { isActive: true, enabled: true, commentItemCount: 42 },
};

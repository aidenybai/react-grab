import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { expect, waitFor } from "storybook/test";
import { Toolbar } from "react-grab/src/components/toolbar/index.js";
import { Canvas } from "./target-box.js";
import { noop } from "./noop.js";

interface ToolbarSceneProps {
  isActive: boolean;
  enabled: boolean;
  isContextMenuOpen: boolean;
  collapsed: boolean;
}

const TOOLBAR_STATE_KEY = "react-grab-toolbar-state";

const seedToolbarState = (args: ToolbarSceneProps): void => {
  if (typeof localStorage === "undefined") return;
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
        onToggle={noop}
        onStateChange={noop}
        onSelectHoverChange={noop}
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
    collapsed: false,
  },
  argTypes: {
    isActive: { control: "boolean" },
    enabled: { control: "boolean" },
    isContextMenuOpen: { control: "boolean" },
    collapsed: { control: "boolean" },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { isActive: false, enabled: true },
};

export const Active: Story = {
  args: { isActive: true, enabled: true },
};

export const Collapsed: Story = {
  args: { isActive: false, enabled: false, collapsed: true },
};

export const Disabled: Story = {
  args: { isActive: false, enabled: false },
};

export const ActiveDisabled: Story = {
  args: { isActive: true, enabled: false },
};

export const ContextMenuOpen: Story = {
  args: { isActive: true, enabled: true, isContextMenuOpen: true },
};

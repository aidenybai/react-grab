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
}

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
  },
  argTypes: {
    isActive: { control: "boolean" },
    enabled: { control: "boolean" },
    isContextMenuOpen: { control: "boolean" },
    commentItemCount: { control: { type: "number", min: 0, max: 99 } },
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

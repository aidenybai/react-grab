import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { expect, waitFor } from "storybook/test";
import { CommentsDropdown } from "react-grab/src/components/comments-dropdown.js";
import type { DropdownAnchor } from "react-grab/src/types.js";
import type { CommentPreset } from "./fixtures.js";
import { COMMENT_PRESET_KEYS, getItemPresets } from "./fixtures.js";
import { Canvas } from "./target-box.js";
import { noop } from "./noop.js";

interface CommentsDropdownSceneProps {
  preset: CommentPreset;
}

const DROPDOWN_ANCHOR: DropdownAnchor = {
  x: 32,
  y: 64,
  edge: "top",
  toolbarWidth: 200,
};

const meta: Meta<CommentsDropdownSceneProps> = {
  title: "Components/CommentsDropdown",
  render: (args) => (
    <Canvas>
      <CommentsDropdown
        position={DROPDOWN_ANCHOR}
        items={getItemPresets()[args.preset]}
        onSelectItem={noop}
        onItemHover={noop}
        onCopyAll={noop}
        onCopyAllHover={noop}
        onClearAll={noop}
        onDismiss={noop}
        onDropdownHover={noop}
      />
    </Canvas>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector("[data-react-grab-comments-dropdown]")).not.toBeNull();
    });
  },
  args: { preset: "multiple" },
  argTypes: {
    preset: { control: "select", options: COMMENT_PRESET_KEYS },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = { args: { preset: "empty" } };
export const SingleItem: Story = { args: { preset: "single" } };
export const MultipleItems: Story = { args: { preset: "multiple" } };
export const Annotated: Story = { args: { preset: "annotated" } };
export const LongNames: Story = { args: { preset: "long-names" } };
export const Many: Story = { args: { preset: "many" } };
export const TagOnly: Story = { args: { preset: "tag-only" } };

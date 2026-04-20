import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { ContextMenu } from "react-grab/src/components/context-menu.js";
import type { Position } from "react-grab/src/types.js";
import { assertMounted } from "./assertions.js";
import { DEMO_BOUNDS } from "./demo-bounds.js";
import { createMenuActions } from "./fixtures.js";
import { TargetBox } from "./target-box.js";
import { noop } from "./noop.js";

interface ContextMenuSceneProps {
  tagName: string;
  componentName?: string;
  hasFilePath: boolean;
}

const MENU_POSITION: Position = {
  x: DEMO_BOUNDS.x + DEMO_BOUNDS.width / 2,
  y: DEMO_BOUNDS.y + DEMO_BOUNDS.height + 4,
};

const meta: Meta<ContextMenuSceneProps> = {
  title: "Components/ContextMenu",
  render: (args) => (
    <>
      <TargetBox />
      <ContextMenu
        position={MENU_POSITION}
        selectionBounds={DEMO_BOUNDS}
        tagName={args.tagName}
        componentName={args.componentName}
        hasFilePath={args.hasFilePath}
        actions={createMenuActions(args.hasFilePath)}
        onDismiss={noop}
        onHide={noop}
      />
    </>
  ),
  play: ({ canvasElement }) => assertMounted(canvasElement, "[data-react-grab-context-menu]"),
  args: { tagName: "button", componentName: "Button", hasFilePath: false },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: { tagName: "button", componentName: "Button", hasFilePath: false },
};

export const WithOpen: Story = {
  args: { tagName: "div", componentName: "Header", hasFilePath: true },
};

export const TagOnly: Story = {
  args: { tagName: "section", componentName: undefined, hasFilePath: false },
};

export const LongComponentName: Story = {
  args: {
    tagName: "div",
    componentName: "SuperLongComponentNameThatNeedsTruncation",
    hasFilePath: true,
  },
};

export const LongTagName: Story = {
  args: {
    tagName: "my-custom-interactive-web-component",
    componentName: undefined,
    hasFilePath: false,
  },
};
